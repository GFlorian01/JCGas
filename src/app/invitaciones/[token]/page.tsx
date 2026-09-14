import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/invitaciones/${token}`);
  const { error } = await supabase.rpc("accept_team_invitation", { invitation_token: token });
  if (error) return <main className="login-page"><section className="login-card"><h1>No fue posible aceptar la invitación</h1><p>{error.message}</p><Link className="primary" href="/">Ir al inicio</Link></section></main>;
  redirect("/");
}
