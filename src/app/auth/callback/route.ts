import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next")?.startsWith("/") ? url.searchParams.get("next")! : "/";
  const response = NextResponse.redirect(new URL(next, url.origin));
  if (!code) return response;
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: { getAll: () => request.headers.get("cookie")?.split("; ").map((value) => { const [name, ...rest] = value.split("="); return { name, value: rest.join("=") }; }) ?? [], setAll: (cookies) => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) },
  });
  await supabase.auth.exchangeCodeForSession(code);
  return response;
}
