import type { User } from "@supabase/supabase-js";
import { PawIcon } from "@/components/icons";
import { getDisplayName } from "@/lib/auth/display-name";
import { UserMenu } from "./UserMenu";

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
        <div className="flex items-center gap-6">
          <div className="hidden items-center gap-6 text-sm font-medium text-foreground/70 sm:flex">
            <a href="/dashboard" className="transition hover:text-foreground">
              Inicio
            </a>
            <a href="/mascotas" className="transition hover:text-foreground">
              Mis mascotas
            </a>
            <a href="/buscar-cuidador" className="transition hover:text-foreground">
              Buscar cuidador
            </a>
            <a href="/reservas" className="transition hover:text-foreground">
              Reservas
            </a>
          </div>
          <UserMenu
            name={getDisplayName(user)}
            email={user.email ?? ""}
            homeHref="/dashboard"
          />
        </div>
      </nav>
    </header>
  );
}
