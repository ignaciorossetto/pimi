"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/icons";

/**
 * Input de contraseña con el "ojito" para mostrar/ocultar en texto plano
 * (a pedido explícito) — se usa en login y registro. El botón es
 * type="button" y tabIndex={-1} para que no interfiera con el submit del
 * form ni robe foco al tabular entre campos.
 */
export function PasswordField({
  id,
  label,
  accent = false,
  ...props
}: {
  label: string;
  /** Usa el foco verde (cuidador) en vez del naranja (dueño) por defecto. */
  accent?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label className="text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          {...props}
          className={`w-full rounded-lg border border-foreground/20 px-4 py-2 pr-11 focus:outline-none ${
            accent ? "focus:border-accent" : "focus:border-brand"
          }`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-foreground/40 transition hover:text-foreground/70"
        >
          {visible ? (
            <EyeOffIcon className="h-5 w-5" />
          ) : (
            <EyeIcon className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}
