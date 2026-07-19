import { PawIcon } from "@/components/icons";

export function Footer() {
  return (
    <footer className="border-t border-foreground/10 bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white">
            <PawIcon className="h-3.5 w-3.5" />
          </span>
          <span className="font-bold">Pimi</span>
          <span className="text-sm text-foreground/50">
            · Cuidado de mascotas de confianza
          </span>
        </div>

        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-foreground/60">
          <a href="#como-funciona" className="hover:text-foreground">
            Cómo funciona
          </a>
          <a href="#nosotros" className="hover:text-foreground">
            Nosotros
          </a>
          <a href="/login" className="hover:text-foreground">
            Iniciar sesión
          </a>
          <a href="/registro" className="hover:text-foreground">
            Crear cuenta
          </a>
        </nav>
      </div>
      <div className="border-t border-foreground/10 px-6 py-4 text-center text-xs text-foreground/40">
        © {new Date().getFullYear()} Pimi. Córdoba, Argentina.
      </div>
    </footer>
  );
}
