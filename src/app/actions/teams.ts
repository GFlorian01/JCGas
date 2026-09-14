"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
  return `${process.env.APP_BASE_URL}/invitaciones/${data}`;
}

export async function removeFromTeam(teamId: string, userId: string) {
  const supabase = await requireUser();
  const { error } = await supabase.rpc("remove_team_member", { target_team: teamId, target_user: userId });
  if (error) throw new Error(error.message);
  revalidatePath("/");
}
