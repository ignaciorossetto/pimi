"use client";

import { usePathname } from "next/navigation";
import { PawIcon } from "@/components/icons";

/**
 * Navbar compartido por todo el sitio público. Cuando estás en
 * /para-cuidadores, la sección entera cambia a la paleta accent (verde)
 * para que se note visualmente que estás en "modo cuidador" — a pedido
 * explícito, porque antes "Iniciar sesión"/"Crear cuenta" te mandaban al
 * flujo de dueño aunque estuvieras leyendo la landing de cuidadores, lo
 * cual era confuso. Acá es donde se decide a qué login/registro mandan
 * esos botones (con o sin ?rol=cuidador).
 */
export function Navbar() {
  const pathname = usePathname();
  const isCuidador = pathname?.startsWith("/para-cuidadores") ?? false;

  return (
    <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-2">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full text-white ${
              isCuidador ? "bg-accent" : "bg-brand"
            }`}
          >
            <PawIcon className="h-4 w-4" />
          </span>
          <span className="text-lg font-bold tracking-tight">Pimi</span>
          {isCuidador && (
            <span className="ml-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
              Cuidadores
            </span>
          )}
        </a>

        <div className="hidden items-center gap-8 text-sm font-medium text-foreground/70 md:flex">
          <a href="#como-funciona" className="transition hover:text-foreground">
            Cómo funciona
          </a>
          <a href="#nosotros" className="transition hover:text-foreground">
            Nosotros
          </a>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <a
            href={isCuidador ? "/login?rol=cuidador" : "/login"}
            className="inline-block rounded-lg px-2.5 py-2 text-sm font-semibold text-foreground/80 transition hover:bg-foreground/5 sm:px-4"
          >
            Iniciar sesión
          </a>
          <a
            href={isCuidador ? "/registro?rol=cuidador" : "/registro"}
            className={`rounded-lg px-2.5 py-2 text-sm font-semibold text-white transition sm:px-4 ${
              isCuidador ? "bg-accent hover:opacity-90" : "bg-brand hover:bg-brand-dark"
            }`}
          >
            Crear cuenta
          </a>
        </div>
      </nav>
    </header>
  );
}
