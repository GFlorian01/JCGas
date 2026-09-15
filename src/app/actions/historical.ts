"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { historicalQuotations } from "@/lib/historical-quotations";
type TeamMembership = { id: string; role: "admin" | "coordinator" | "operator" | "reviewer" | "viewer" };

export async function importHistoricalQuotations(teamId: string): Promise<{ imported: number; skipped: number; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { imported: 0, skipped: 0, error: "Tu sesión expiró. Ingresa nuevamente." };

  // Do not read team_members directly here: RLS can make a valid administrator
  // look like a non-member during a Server Action. This RPC is security-definer
  // and is also the source used by the workspace selector.
  const { data: memberships, error: membershipError } = await supabase.rpc("get_my_teams");
  if (membershipError) return { imported: 0, skipped: 0, error: `No se pudo validar tu acceso: ${membershipError.message}` };
  const membership = ((memberships ?? []) as TeamMembership[]).find((item) => item.id === teamId);
  if (membership?.role !== "admin") return { imported: 0, skipped: 0, error: "Solo un administrador puede importar el historial." };

  let imported = 0;
  let skipped = 0;
  for (const quotation of historicalQuotations) {
    const { data: existing, error: lookupError } = await supabase.from("quotations").select("id").eq("team_id", teamId).eq("quotation_date", quotation.date).eq("service_type", quotation.serviceType).limit(1);
    if (lookupError) return { imported, skipped, error: `No se pudo verificar ${quotation.source}: ${lookupError.message}` };
    if (existing?.length) { skipped++; continue; }
    const { error } = await supabase.rpc("create_quotation", { target_team: teamId, client_name: quotation.clientName, client_ruc: "", client_contact_name: "", client_contact_email: "", client_contact_phone: "", location_name: quotation.locationName, location_address: quotation.address, location_district: "", location_province: "", location_department: "", location_latitude: null, location_longitude: null, quotation_date: quotation.date, quotation_valid_until: null, quotation_service_type: quotation.serviceType, quotation_service_description: `Importada desde ${quotation.source}. Datos transcritos del documento original.`, quotation_items: quotation.items.map((item) => ({ description: item.description, quantity: item.quantity, unit_price: item.price })) });
    if (error) return { imported, skipped, error: `${quotation.source}: ${error.message}` };
    imported++;
  }
  revalidatePath("/");
  return { imported, skipped };
}
