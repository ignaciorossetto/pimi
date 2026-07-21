import { LoginForm } from "@/components/auth/LoginForm";

type PageProps = {
  searchParams: Promise<{ rol?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const { rol, next } = await searchParams;
  const isCaregiver = rol === "cuidador";

  return (
    <div className="w-full max-w-sm">
      <div className="rounded-2xl bg-background p-8 shadow-sm ring-1 ring-foreground/10">
        <span
          className={
            isCaregiver
              ? "inline-flex rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent"
              : "inline-flex rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand"
          }
        >
          {isCaregiver ? "Acceso cuidadores" : "Acceso dueños"}
        </span>

        <h1 className="mt-3 text-2xl font-bold tracking-tight">
          {isCaregiver ? "Iniciá sesión como cuidador" : "Iniciar sesión"}
        </h1>
        <p className="mt-1 text-sm text-foreground/60">
          {isCaregiver
            ? "Entrá para ver tus solicitudes y reservas."
            : "Entrá para gestionar tus mascotas y reservas."}
        </p>

        <LoginForm next={next ?? null} isCaregiver={isCaregiver} />

        <p className="mt-6 text-center text-sm text-foreground/60">
          ¿No tenés cuenta?{" "}
          <a
            href={isCaregiver ? "/registro?rol=cuidador" : "/registro"}
            className={
              isCaregiver
                ? "font-semibold text-accent hover:underline"
                : "font-semibold text-brand hover:underline"
            }
          >
            Creá una
          </a>
        </p>
      </div>

      <p className="mt-4 text-center text-sm text-foreground/60">
        {isCaregiver ? (
          <>
            ¿Buscás cuidador para tu mascota?{" "}
            <a href="/login" className="font-semibold text-accent hover:underline">
              Iniciá sesión acá
            </a>
          </>
        ) : (
          <>
            ¿Sos cuidador?{" "}
            <a
              href="/login?rol=cuidador"
              className="font-semibold text-accent hover:underline"
            >
              Iniciá sesión acá
            </a>
          </>
        )}
      </p>
    </div>
  );
}
