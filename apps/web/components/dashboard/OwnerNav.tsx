import type { User } from "@supabase/supabase-js";
import { PawIcon } from "@/components/icons";
import { getAvatarUrl } from "@/lib/auth/avatar";
import { getDisplayName } from "@/lib/auth/display-name";
import { MobileNav } from "./MobileNav";
import { UserMenu } from "./UserMenu";

const NAV_LINKS = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/mascotas", label: "Mis mascotas" },
  { href: "/buscar-cuidador", label: "Buscar cuidador" },
  { href: "/reservas", label: "Reservas" },
];

export function OwnerNav({ user }: { user: User }) {
  return (
    <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/80 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <a href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white">
            <PawIcon className="h-4 w-4" />
          </span>
          <span className="text-lg font-bold tracking-tight">Pimi</span>
        </a>
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="hidden items-center gap-6 text-sm font-medium text-foreground/70 sm:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="transition hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </div>
          {/* En mobile los links de arriba desaparecen (hidden hasta sm) —
              sin esto no había ninguna forma de llegar a "Buscar cuidador"
              una vez logueado en pantallas chicas. */}
          <MobileNav links={NAV_LINKS} />
          <UserMenu
            name={getDisplayName(user)}
            email={user.email ?? ""}
            homeHref="/dashboard"
            fotoUrl={getAvatarUrl(user)}
          />
        </div>
      </nav>
    </header>
  );
}
