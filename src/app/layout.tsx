import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CotizaPro | Cotizaciones",
  description: "Gestión interna de cotizaciones",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
