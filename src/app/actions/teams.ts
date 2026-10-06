"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendInvitationEmail } from "@/lib/invitation-email";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autorizado");
  return supabase;
}

export async function createTeam(name: string) {
  const supabase = await requireUser();
  const { data, error } = await supabase.rpc("create_team", { team_name: name });
  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data;
}

export async function inviteToTeam(teamId: string, email: string, role: "admin" | "coordinator" | "operator" | "reviewer" | "viewer") {
  const supabase = await requireUser();
  const { data, error } = await supabase.rpc("create_team_invitation", { target_team: teamId, invitee_email: email, invitee_role: role });
  if (error) throw new Error(error.message);
  const link = `${(process.env.APP_BASE_URL ?? "").replace(/\/$/, "")}/invitaciones/${data}`;
  const to = email.trim().toLowerCase();
  const [{ data: { user } }, { data: team }] = await Promise.all([supabase.auth.getUser(), supabase.from("teams").select("name").eq("id", teamId).single()]);
  try {
    await sendInvitationEmail({ to, adminName: user?.user_metadata.full_name ?? user?.user_metadata.name ?? user!.email!.split("@")[0], adminEmail: user!.email!, teamName: team?.name ?? "tu equipo", role, link });
    return `Invitación enviada a ${to}. Si no le llega en unos minutos, que revise spam o comparte este enlace: ${link}`;
  } catch (e) {
    // The invitation exists even if the email fails, so the admin can still share the link by hand.
    return `Invitación creada, pero no se pudo enviar el correo (${e instanceof Error ? e.message : "error desconocido"}). Comparte este enlace: ${link}`;
  }
}

export async function removeFromTeam(teamId: string, userId: string) {
  const supabase = await requireUser();
  const { error } = await supabase.rpc("remove_team_member", { target_team: teamId, target_user: userId });
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function changeMemberRole(teamId: string, userId: string, role: "admin" | "coordinator" | "operator" | "reviewer" | "viewer") {
  const supabase = await requireUser();
  const { error } = await supabase.rpc("update_team_member_role", { target_team: teamId, target_user: userId, new_role: role });
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function renameTeam(teamId: string, name: string) {
  const supabase = await requireUser();
  const { error } = await supabase.rpc("rename_team", { target_team: teamId, new_name: name });
  if (error) throw new Error(error.message);
  revalidatePath("/");
}
