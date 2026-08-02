import { MobileNav } from "@/components/dashboard/MobileNav";

const NAV_LINKS = [
  { href: "/cuidador", label: "Inicio" },
  { href: "/cuidador/pagos", label: "Pagos" },
];

/**
 * Nav de secciones del panel cuidador. Antes esta área tenía una sola
 * pantalla (/cuidador) así que no hacía falta — al sumar /cuidador/pagos
 * hace falta algún link para llegar ahí. Mismo patrón que AdminNav/
 * OwnerNav: links en desktop, MobileNav (hamburguesa) para pantallas
 * chicas.
 */
export function CuidadorNav() {
  return (
    <div className="border-b border-foreground/10 bg-background/60">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-2.5">
        <nav className="hidden items-center gap-5 text-sm font-medium text-foreground/70 sm:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="relative sm:hidden">
          <MobileNav links={NAV_LINKS} />
        </div>
      </div>
    </div>
  );
}
