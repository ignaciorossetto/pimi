"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Menú hamburguesa SOLO para mobile (< sm / 640px). OwnerNav ya tenía los
 * links de navegación (Inicio, Mis mascotas, Buscar cuidador, Reservas),
 * pero estaban en un <div className="hidden ... sm:flex"> sin ningún
 * reemplazo en mobile — en pantallas chicas esos links directamente
 * desaparecían sin dejar ninguna forma de navegar (bug reportado: no se
 * podía llegar a "Buscar cuidador" después de cargar una mascota).
 */
export function MobileNav({
  links,
}: {
  links: { href: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="sm:hidden" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-foreground/15 text-foreground/70 transition hover:bg-foreground/5"
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path
              d="M4 7h16M4 12h16M4 17h16"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full border-b border-foreground/10 bg-background px-6 py-3 shadow-lg">
          <nav className="flex flex-col gap-1 text-sm font-medium text-foreground/80">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 transition hover:bg-foreground/5"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
