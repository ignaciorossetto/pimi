import { RegisterForm } from "@/components/auth/RegisterForm";

type PageProps = {
  searchParams: Promise<{ rol?: string }>;
};

export default async function RegisterPage({ searchParams }: PageProps) {
  const { rol } = await searchParams;
  const isCaregiver = rol === "cuidador";

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl bg-background p-8 shadow-sm ring-1 ring-foreground/10">
        <span
          className={
            isCaregiver
              ? "inline-flex rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent"
              : "inline-flex rounded-full bg-brand/10 px-3 py-1 text-xs font-medium text-brand"
          }
        >
          {isCaregiver ? "Sumate como cuidador" : "Cuenta de dueño"}
        </span>

        <h1 className="mt-3 text-2xl font-bold tracking-tight">
          {isCaregiver ? "Convertite en cuidador Pimi" : "Creá tu cuenta"}
        </h1>
        <p className="mt-1 text-sm text-foreground/60">
          {isCaregiver
            ? "Completá tu perfil para empezar a recibir solicitudes de dueños."
            : "En un minuto vas a poder buscar cuidadores verificados."}
        </p>

        <RegisterForm isCaregiver={isCaregiver} />

        <p className="mt-6 text-center text-sm text-foreground/60">
          ¿Ya tenés cuenta?{" "}
          <a
            href={isCaregiver ? "/login?rol=cuidador" : "/login"}
            className="font-semibold text-brand hover:underline"
          >
            Iniciá sesión
          </a>
        </p>
      </div>

      <p className="mt-4 text-center text-sm text-foreground/60">
        {isCaregiver ? (
          <>
            ¿Buscás cuidador para tu mascota?{" "}
            <a href="/registro" className="font-semibold text-accent hover:underline">
              Creá tu cuenta acá
            </a>
          </>
        ) : (
          <>
            ¿Querés ser cuidador?{" "}
            <a
              href="/para-cuidadores"
              className="font-semibold text-accent hover:underline"
            >
              Conocé cómo funciona
            </a>
          </>
        )}
      </p>
    </div>
  );
}
