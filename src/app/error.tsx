"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <main className="login-page"><section className="login-card"><h1>No se pudo actualizar la información</h1><p>La operación puede haberse completado. Vuelve a cargar los datos para confirmar el resultado.</p><button className="primary full-button" onClick={reset}>Reintentar</button></section></main>;
}
