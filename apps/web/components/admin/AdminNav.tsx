import { MobileNav } from "@/components/dashboard/MobileNav";

const NAV_LINKS = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/cuidadores", label: "Cuidadores" },
  { href: "/admin/duenos", label: "Dueños" },
  { href: "/admin/mapa", label: "Mapa" },
];

/**
 * Nav de secciones del panel admin. Mismo patrón que OwnerNav: links
 * visibles en desktop (sm+), MobileNav (hamburguesa) reutilizado para
 * mobile — sin esto los links de abajo desaparecerían en pantallas
 * chicas sin ningún reemplazo, como ya pasó una vez en el panel dueño.
 */
export function AdminNav() {
  return (
    <div className="border-b border-background/10 bg-foreground/95">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-2.5">
        <nav className="hidden items-center gap-5 text-sm font-medium text-background/70 sm:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition hover:text-background"
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
