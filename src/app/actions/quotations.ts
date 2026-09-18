"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const quotationSchema = z.object({
  teamId: z.string().uuid(),
  clientName: z.string().trim().min(2).max(200),
  clientRuc: z.string().trim().max(20).optional().default(""),
  contactName: z.string().trim().max(200).optional().default(""),
  contactEmail: z.string().trim().email().or(z.literal("")),
  contactPhone: z.string().trim().max(40).optional().default(""),
  locationName: z.string().trim().min(2).max(200),
  address: z.string().trim().max(300).optional().default(""),
  district: z.string().trim().max(100).optional().default(""),
  province: z.string().trim().max(100).optional().default(""),
  department: z.string().trim().max(100).optional().default(""),
  coordinates: z.string().trim().optional().default(""),
  quotationDate: z.string().date(),
  validUntil: z.string().date().or(z.literal("")),
  serviceType: z.string().trim().min(2).max(200),
  serviceDescription: z.string().trim().min(3).max(5000),
  items: z.array(z.object({ description: z.string().trim().min(3).max(500), quantity: z.number().positive(), price: z.number().min(0) })).min(1),
});

function parseCoordinates(value: string) {
  if (!value) return { latitude: null, longitude: null };
  const parts = value.split(/[;,]/).map((part) => Number(part.trim()));
  if (parts.length !== 2 || parts.some((part) => !Number.isFinite(part))) throw new Error("Usa coordenadas con el formato latitud; longitud.");
  return { latitude: parts[0], longitude: parts[1] };
}

export async function createQuotation(input: unknown) {
  try {
    const values = quotationSchema.parse(input);
    const { latitude, longitude } = parseCoordinates(values.coordinates);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Tu sesión terminó. Ingresa nuevamente." };
    const { error } = await supabase.rpc("create_quotation", {
      target_team: values.teamId,
      client_name: values.clientName,
      client_ruc: values.clientRuc,
      client_contact_name: values.contactName,
      client_contact_email: values.contactEmail,
      client_contact_phone: values.contactPhone,
      location_name: values.locationName,
      location_address: values.address,
      location_district: values.district,
      location_province: values.province,
      location_department: values.department,
      location_latitude: latitude,
      location_longitude: longitude,
      quotation_date: values.quotationDate,
      quotation_valid_until: values.validUntil || null,
      quotation_service_type: values.serviceType,
      quotation_service_description: values.serviceDescription,
      quotation_items: values.items.map((item) => ({ description: item.description, quantity: item.quantity, unit_price: item.price })),
    });
    if (error) return { error: error.message };
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No fue posible guardar la cotización." };
  }
}

export async function updateQuotation(input: unknown) {
  try {
    const values = quotationSchema.extend({ quotationId: z.string().uuid(), status: z.enum(["draft", "sent", "approved", "rejected", "expired"]), statusComment: z.string().max(500).optional().default("") }).parse(input);
    const supabase = await createClient();
    const { error } = await supabase.rpc("update_quotation_record", { target_quotation: values.quotationId, new_client_name: values.clientName, new_location_name: values.locationName, new_address: values.address, new_quotation_date: values.quotationDate, new_valid_until: values.validUntil || null, new_service_type: values.serviceType, new_service_description: values.serviceDescription, new_status: values.status, new_items: values.items.map((item) => ({ description: item.description, quantity: item.quantity, unit_price: item.price })), status_comment: values.statusComment });
    if (error) return { error: error.message };
    revalidatePath("/"); return { success: true };
  } catch (error) { return { error: error instanceof Error ? error.message : "No fue posible actualizar la cotización." }; }
}
