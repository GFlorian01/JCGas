"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    setError(null);
    const next = new URLSearchParams(window.location.search).get("next") ?? "/";
    const { error: authError } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (authError) { setError(authError.message); setLoading(false); }
  }

  return <main className="login-page"><section className="login-card"><div className="brand"><span className="brand-mark">C</span><span>Cotiza<span>Pro</span></span></div><h1>Ingresa a tu espacio de trabajo</h1><p>Solo se permiten cuentas personales de Gmail que hayan sido invitadas a un equipo.</p><button className="primary full-button" onClick={signIn} disabled={loading}>{loading ? "Redirigiendo…" : "Continuar con Google"}</button>{error && <p role="alert" className="warning">{error}</p>}<small>Al continuar aceptas usar tu cuenta Gmail para identificarte en CotizaPro.</small></section></main>;
}
