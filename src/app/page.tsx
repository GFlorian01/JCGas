import { Workspace } from "@/components/workspace";
import { createClient } from "@/lib/supabase/server";

type TeamRow = { id: string; name: string; role: "admin" | "coordinator" | "operator" | "reviewer" | "viewer" };
type ClientRow = { id: string; team_id: string; business_name: string };
type LocationRow = { id: string; team_id: string; client_id: string; name: string };
type MemberRow = { user_id: string; full_name: string | null; email: string; role: "admin" | "coordinator" | "operator" | "reviewer" | "viewer"; joined_at: string };
type QuotationRow = { id: string; team_id: string; quotation_code: string; quotation_date: string; status: "draft" | "sent" | "approved" | "rejected" | "expired"; total_amount: number; client_name: string; location_name: string };
type DetailRow = { quotation_id: string; client_name: string; location_name: string; address: string; latitude: number | null; longitude: number | null; quotation_date: string; valid_until: string | null; service_type: string; service_description: string; status: "draft" | "sent" | "approved" | "rejected" | "expired"; items: { description: string; quantity: number; price: number }[]; versions: { version: number; event: string; changed_at: string }[]; history: { from: "draft" | "sent" | "approved" | "rejected" | "expired" | null; to: "draft" | "sent" | "approved" | "rejected" | "expired"; comment: string | null; changed_at: string }[] };

export default async function Home({ searchParams }: { searchParams: Promise<{ team?: string }> }) {
  const { team: requestedTeamId } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: membershipData, error: teamsError } = await supabase.rpc("get_my_teams");
  if (teamsError) throw new Error(`No se pudieron cargar los equipos: ${teamsError.message}`);
  const teams = (membershipData ?? []) as TeamRow[];
  const teamIds = teams.map((team) => team.id);
  const memberResults = await Promise.all(teams.map(async (team) => ({ teamId: team.id, result: await supabase.rpc("get_team_members", { target_team: team.id }) })));
  const members = memberResults.flatMap(({ teamId, result }) => ((result.data ?? []) as MemberRow[]).map((member) => ({ ...member, team_id: teamId })));
  const [clientResult, locationResult, quotationResult, detailResult] = teamIds.length ? await Promise.all([
    supabase.from("clients").select("id, team_id, business_name").in("team_id", teamIds).eq("active", true).order("business_name"),
    supabase.from("service_locations").select("id, team_id, client_id, name").in("team_id", teamIds).eq("active", true).order("name"),
    supabase.rpc("get_my_quotations"),
    supabase.rpc("get_my_quotation_details"),
  ]) : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];
  const quotations = ((quotationResult.data ?? []) as QuotationRow[]).map((row) => ({ ...row, total_amount: Number(row.total_amount) }));
  const userName = user.user_metadata.full_name ?? user.user_metadata.name ?? user.email?.split("@")[0] ?? "Usuario";
  return <Workspace userName={userName} initialTeamId={requestedTeamId} teams={teams} members={members} clients={(clientResult.data ?? []) as ClientRow[]} locations={(locationResult.data ?? []) as LocationRow[]} quotations={quotations} details={(detailResult.data ?? []) as DetailRow[]} />;
}
