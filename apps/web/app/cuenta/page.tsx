import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { getDisplayName } from "@/lib/auth/display-name";
import { requireUser } from "@/lib/auth/require-user";

type PageProps = {
  searchParams: Promise<{ from?: string }>;
};

function safeFrom(from: string | undefined): string {
  if (from && from.startsWith("/") && !from.startsWith("//")) return from;
  return "/dashboard";
}

export default async function AccountPage({ searchParams }: PageProps) {
  const { from } = await searchParams;
  const user = await requireUser("/cuenta");
  const backHref = safeFrom(from);
  const telefono = (user.user_metadata as { telefono?: string } | null)
    ?.telefono;

  return (
    <div>
      <a
        href={backHref}
        className="text-sm font-medium text-foreground/60 hover:text-foreground"
      >
        ← Volver
      </a>

      <h1 className="mt-4 text-2xl font-bold">Mis datos</h1>

      <div className="mt-6 rounded-2xl bg-background p-6 shadow-sm ring-1 ring-foreground/10">
        <dl className="flex flex-col gap-3 text-sm">
          <div>
            <dt className="text-foreground/50">Nombre</dt>
            <dd className="font-medium">{getDisplayName(user)}</dd>
          </div>
          <div>
            <dt className="text-foreground/50">Email</dt>
            <dd className="font-medium">{user.email}</dd>
          </div>
          {telefono && (
            <div>
              <dt className="text-foreground/50">Teléfono</dt>
              <dd className="font-medium">{telefono}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="mt-6 rounded-2xl bg-background p-6 shadow-sm ring-1 ring-foreground/10">
        <h2 className="font-semibold">Cambiar contraseña</h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
