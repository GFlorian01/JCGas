export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    { status: "ok", service: "cotizaciones-app", environment: process.env.APP_ENV ?? "unknown" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
