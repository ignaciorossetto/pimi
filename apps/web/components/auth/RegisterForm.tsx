"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PasswordField } from "@/components/auth/PasswordField";

// "visita_a_domicilio" se sacó de la app: solo quedan paseo y hospedaje en
// la casa del cuidador (decisión de producto explícita).
const TIPOS_SERVICIO = [
  { value: "hospedaje", label: "Hospedaje en mi casa" },
  { value: "paseo", label: "Paseos" },
];

function Field({
  label,
  id,
  accent = false,
  ...props
}: {
  label: string;
  id: string;
  /** Usa el foco verde (cuidador) en vez del naranja (dueño) por defecto. */
  accent?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={id}
        {...props}
        className={`mt-1 w-full rounded-lg border border-foreground/20 px-4 py-2 focus:outline-none ${
          accent ? "focus:border-accent" : "focus:border-brand"
        }`}
      />
    </div>
  );
}

export function RegisterForm({ isCaregiver }: { isCaregiver: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const formData = new FormData(event.currentTarget);
    const nombre = String(formData.get("nombre") ?? "").trim();
    const telefono = String(formData.get("telefono") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const password2 = String(formData.get("password2") ?? "");

    if (password !== password2) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña tiene que tener al menos 6 caracteres.");
      return;
    }

    const roles = [isCaregiver ? "cuidador" : "dueño"];
    const metadata: Record<string, unknown> = { nombre, telefono, roles };

    // Zona y tarifa ya NO se piden acá: zona se completa sola con el
    // domicilio de la verificación de identidad, y la tarifa se carga
    // después en "Editar perfil" (con el precio sugerido de mercado al
    // lado). Pedirlas en el alta era redundante y frenaba el registro.
    if (isCaregiver) {
      metadata.bio = String(formData.get("bio") ?? "").trim();
      metadata.tipos_de_servicio = formData.getAll("tipos_de_servicio");
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });

    if (signUpError) {
      setError(
        signUpError.message === "User already registered"
          ? "Ya existe una cuenta con ese email."
          : "No pudimos crear la cuenta. Probá de nuevo.",
      );
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push(isCaregiver ? "/cuidador" : "/dashboard");
      router.refresh();
      return;
    }

    setLoading(false);
    setNotice(
      "Te enviamos un email para confirmar tu cuenta. Confirmalo y después iniciá sesión.",
    );
  }

  if (notice) {
    return (
      <div className="mt-6 rounded-lg bg-accent/10 p-4 text-sm text-accent">
        {notice}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Nombre completo"
          id="nombre"
          type="text"
          placeholder="Ana Pérez"
          autoComplete="name"
          required
          accent={isCaregiver}
        />
        <Field
          label="Teléfono"
          id="telefono"
          type="tel"
          placeholder="11 5555-5555"
          autoComplete="tel"
          accent={isCaregiver}
        />
      </div>
      <Field
        label="Email"
        id="email"
        type="email"
        placeholder="vos@email.com"
        autoComplete="email"
        required
        accent={isCaregiver}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <PasswordField
          label="Contraseña"
          id="password"
          placeholder="••••••••"
          autoComplete="new-password"
          required
          minLength={6}
          accent={isCaregiver}
        />
        <PasswordField
          label="Repetir contraseña"
          id="password2"
          placeholder="••••••••"
          autoComplete="new-password"
          required
          minLength={6}
          accent={isCaregiver}
        />
      </div>

      {isCaregiver && (
        <>
          <div className="h-px bg-foreground/10" />
          <p className="text-sm font-semibold">Tu perfil de cuidador</p>
          <p className="text-xs text-foreground/50">
            La zona y la tarifa se completan más adelante: la zona sale
            sola de tu domicilio cuando verifiques tu identidad, y la
            tarifa la cargás en tu perfil cuando quieras.
          </p>

          <div>
            <span className="text-sm font-medium">Tipo de servicio</span>
            <div className="mt-2 flex flex-col gap-2">
              {TIPOS_SERVICIO.map((tipo) => (
                <label
                  key={tipo.value}
                  className="flex items-center gap-2 text-sm text-foreground/80"
                >
                  <input
                    type="checkbox"
                    name="tipos_de_servicio"
                    value={tipo.value}
                    className="h-4 w-4 rounded border-foreground/30 text-accent focus:ring-accent"
                  />
                  {tipo.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="bio">
              Contanos sobre vos
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              placeholder="Experiencia con mascotas, tu casa, disponibilidad..."
              className="mt-1 w-full rounded-lg border border-foreground/20 px-4 py-2 focus:border-accent focus:outline-none"
            />
          </div>
        </>
      )}

      <label className="flex items-start gap-2 text-xs text-foreground/60">
        <input
          type="checkbox"
          required
          className={`mt-0.5 h-4 w-4 rounded border-foreground/30 ${
            isCaregiver ? "text-accent focus:ring-accent" : "text-brand focus:ring-brand"
          }`}
        />
        Acepto los Términos y la Política de Privacidad de Pimi.
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className={`mt-1 rounded-lg px-4 py-2 font-semibold text-white transition disabled:opacity-60 ${
          isCaregiver ? "bg-accent hover:opacity-90" : "bg-brand hover:bg-brand-dark"
        }`}
      >
        {loading
          ? "Creando cuenta..."
          : isCaregiver
            ? "Crear mi perfil de cuidador"
            : "Crear cuenta"}
      </button>
    </form>
  );
}
