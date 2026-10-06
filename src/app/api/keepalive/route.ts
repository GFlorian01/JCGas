import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Daily Vercel cron (vercel.json) hits this so the free Supabase project never looks inactive and gets paused.
// keepalive() is a trivial SQL function (migration 202610060012) so a real query runs without a session.
export async function GET() {
  const { error } = await createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!)
    .rpc("keepalive");
  return Response.json({ ok: !error, error: error?.message }, { status: error ? 500 : 200, headers: { "Cache-Control": "no-store" } });
}
