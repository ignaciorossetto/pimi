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

const PROVIDER_LABEL: Record<string, string> = {
  google: "Google",
  email: "Email y contraseña",
};

export default async function AccountPage({ searchParams }: PageProps) {
  const { from } = await searchParams;
  const user = await requireUser("/cuenta");
  const backHref = safeFrom(from);
  const telefono = (user.user_metadata as { telefono?: string } | null)
    ?.telefono;

  // "providers" lista todos los métodos de acceso vinculados a la cuenta
  // (hoy siempre uno solo: nunca implementamos vincular varios). Si
  // "email" no está ahí, la cuenta se creó con Google y no tiene
  // contraseña propia — no tiene sentido ofrecer "cambiar contraseña".
  const appMetadata = user.app_metadata as
    | { provider?: string; providers?: string[] }
    | null;
  const providers = appMetadata?.providers ?? [];
  const tieneContrasena = providers.includes("email");
  const proveedorPrincipal = appMetadata?.provider ?? providers[0] ?? null;

  const fechaAlta = user.created_at
    ? new Date(user.created_at).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;

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
          <div>
            <dt className="text-foreground/50">Método de acceso</dt>
            <dd className="font-medium">
              {proveedorPrincipal
                ? (PROVIDER_LABEL[proveedorPrincipal] ?? proveedorPrincipal)
                : "—"}
            </dd>
          </div>
          {fechaAlta && (
            <div>
              <dt className="text-foreground/50">Cuenta creada el</dt>
              <dd className="font-medium">{fechaAlta}</dd>
            </div>
          )}
        </dl>
      </div>

      {tieneContrasena ? (
        <div className="mt-6 rounded-2xl bg-background p-6 shadow-sm ring-1 ring-foreground/10">
          <h2 className="font-semibold">Cambiar contraseña</h2>
          <ChangePasswordForm />
        </div>
      ) : (
        <div className="mt-6 rounded-2xl bg-background p-6 shadow-sm ring-1 ring-foreground/10">
          <h2 className="font-semibold">Contraseña</h2>
          <p className="mt-2 text-sm text-foreground/60">
            Tu cuenta se creó con Google, así que no tenés una contraseña de
            Pimi — iniciás sesión directo con tu cuenta de Google.
          </p>
        </div>
      )}
    </div>
  );
}
