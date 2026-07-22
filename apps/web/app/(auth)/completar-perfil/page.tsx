import { CompletarPerfilForm } from "@/components/auth/CompletarPerfilForm";
import { requireUser } from "@/lib/auth/require-user";
import { safeNext } from "@/lib/auth/safe-next";

type PageProps = {
  searchParams: Promise<{ rol?: string; next?: string }>;
};

export default async function CompletarPerfilPage({ searchParams }: PageProps) {
  // Requiere sesión activa: se llega acá recién después del callback de
  // Google, nunca antes.
  const user = await requireUser("/completar-perfil");

  const { rol, next } = await searchParams;
  const rolInicial = rol === "cuidador" ? "cuidador" : "dueño";

  // Google manda "full_name"/"name" en los metadatos (no "nombre", que es
  // el campo propio que usa el alta con contraseña) — lo usamos para
  // prellenar el campo, pero el usuario lo puede editar antes de guardar.
  const metadata = user.user_metadata as
    | { full_name?: string; name?: string }
    | null;
  const nombreInicial = metadata?.full_name || metadata?.name || "";

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl bg-background p-8 shadow-sm ring-1 ring-foreground/10">
        <h1 className="text-2xl font-bold tracking-tight">
          ¡Ya casi! Un último paso
        </h1>
        <p className="mt-1 text-sm text-foreground/60">
          Entraste con Google — contanos si buscás cuidador para tu
          mascota o si querés ser cuidador.
        </p>

        <CompletarPerfilForm
          rolInicial={rolInicial}
          nombreInicial={nombreInicial}
          next={safeNext(next)}
        />
      </div>
    </div>
  );
}
