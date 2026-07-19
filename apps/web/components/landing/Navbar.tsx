import { PawIcon } from "@/components/icons";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/80 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-white">
            <PawIcon className="h-4 w-4" />
          </span>
          <span className="text-lg font-bold tracking-tight">Pimi</span>
        </a>

        <div className="hidden items-center gap-8 text-sm font-medium text-foreground/70 md:flex">
          <a href="#como-funciona" className="transition hover:text-foreground">
            Cómo funciona
          </a>
          <a href="#nosotros" className="transition hover:text-foreground">
            Nosotros
          </a>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="/login"
            className="hidden rounded-lg px-4 py-2 text-sm font-semibold text-foreground/80 transition hover:bg-foreground/5 sm:inline-block"
          >
            Iniciar sesión
          </a>
          <a
            href="/registro"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Crear cuenta
          </a>
        </div>
      </nav>
    </header>
  );
}
