import { Workspace } from "@/components/workspace";
import { createClient } from "@/lib/supabase/server";

type TeamRow = { id: string; name: string; role: string };
type ClientRow = { id: string; team_id: string; business_name: string };
type LocationRow = { id: string; team_id: string; client_id: string; name: string };
type QuotationRow = { id: string; team_id: string; quotation_code: string; quotation_date: string; status: "draft" | "sent" | "approved" | "rejected" | "expired"; total_amount: number; clients: { business_name: string } | null; service_locations: { name: string } | null };

export default async function Home({ searchParams }: { searchParams: Promise<{ team?: string }> }) {
  const { team: requestedTeamId } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: membershipData, error: teamsError } = await supabase.rpc("get_my_teams");
  if (teamsError) throw new Error(`No se pudieron cargar los equipos: ${teamsError.message}`);
  const teams = (membershipData ?? []) as TeamRow[];
  const teamIds = teams.map((team) => team.id);
  const [clientResult, locationResult, quotationResult] = teamIds.length ? await Promise.all([
    supabase.from("clients").select("id, team_id, business_name").in("team_id", teamIds).eq("active", true).order("business_name"),
    supabase.from("service_locations").select("id, team_id, client_id, name").in("team_id", teamIds).eq("active", true).order("name"),
    supabase.from("quotations").select("id, team_id, quotation_code, quotation_date, status, total_amount, clients(business_name), service_locations(name)").in("team_id", teamIds).order("quotation_date", { ascending: false }).limit(100),
  ]) : [{ data: [] }, { data: [] }, { data: [] }];
  const quotations = ((quotationResult.data ?? []) as unknown as QuotationRow[]).map((row) => ({ ...row, total_amount: Number(row.total_amount), client_name: row.clients?.business_name ?? "Cliente eliminado", location_name: row.service_locations?.name ?? "Ubicación eliminada" }));
  const userName = user.user_metadata.full_name ?? user.user_metadata.name ?? user.email?.split("@")[0] ?? "Usuario";
  return <Workspace userName={userName} initialTeamId={requestedTeamId} teams={teams} clients={(clientResult.data ?? []) as ClientRow[]} locations={(locationResult.data ?? []) as LocationRow[]} quotations={quotations} />;
}
