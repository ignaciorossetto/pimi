import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pimi — Cuidado de mascotas de confianza",
  description:
    "Pimi conecta dueños de mascotas con cuidadores verificados en Buenos Aires.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
