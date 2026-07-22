"use client";

import { useState } from "react";
import { EditCaregiverProfileForm } from "./EditCaregiverProfileForm";

const TIPO_VIVIENDA_LABEL: Record<string, string> = {
  casa: "Casa",
  departamento: "Departamento",
  ph: "PH",
  otro: "Otro",
};

type CaregiverProfile = {
  zona: string;
  bio: string | null;
  tarifa_base: number;
  tipos_de_servicio: string[];
  verificado: boolean;
  foto: string | null;
  domicilio_calle?: string | null;
  domicilio_numero?: string | null;
  domicilio_piso_depto?: string | null;
  domicilio_barrio?: string | null;
  domicilio_ciudad?: string | null;
  tipo_vivienda?: string | null;
  tiene_patio?: boolean | null;
  domicilio_lat?: number | null;
  domicilio_lng?: number | null;
  tiene_mascotas_propias?: boolean | null;
  tamanos_aceptados?: string[] | null;
  especies_aceptadas?: string[] | null;
  etapas_aceptadas?: string[] | null;
};

const TAMANO_LABEL: Record<string, string> = {
  chico: "chico",
  mediano: "mediano",
  grande: "grande",
};

const ESPECIE_LABEL: Record<string, string> = {
  perro: "perros",
  gato: "gatos",
  otro: "otros",
};

const ETAPA_LABEL: Record<string, string> = {
  cachorro: "cachorros",
  adulto: "adultos",
  senior: "senior",
};

export function CaregiverProfileCard({
  profile,
  addressChangeRequest,
  verificationEstado,
}: {
  profile: CaregiverProfile | null;
  addressChangeRequest?: {
    estado: string;
    notas_admin: string | null;
    created_at: string;
  } | null;
  verificationEstado?: string | null;
}) {
  const [editing, setEditing] = useState(false);

  if (!profile) {
    return (
      <p className="mt-2 text-sm text-foreground/70">
        Todavía no completaste tu perfil de cuidador.
      </p>
    );
  }

  if (editing) {
    return (
      <div className="mt-2">
        <EditCaregiverProfileForm
          profile={profile}
          addressChangeRequest={addressChangeRequest}
          verificationEstado={verificationEstado}
          onSaved={() => setEditing(false)}
        />
        <button
          onClick={() => setEditing(false)}
          className="mt-3 text-sm font-medium text-foreground/60 hover:text-foreground"
        >
          Cancelar
        </button>
      </div>
    );
  }

  const domicilioCompleto = [
    profile.domicilio_calle && profile.domicilio_numero
      ? `${profile.domicilio_calle} ${profile.domicilio_numero}`
      : null,
    profile.domicilio_piso_depto,
    profile.domicilio_barrio,
    profile.domicilio_ciudad,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mt-2">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-foreground/5">
          {profile.foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.foto}
              alt="Tu foto de perfil"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl">
              🙂
            </div>
          )}
        </div>
        <ul className="text-sm text-foreground/70">
          <li>Zona: {profile.zona}</li>
          <li>Tarifa: ${profile.tarifa_base} / día</li>
          <li>Servicios: {profile.tipos_de_servicio?.join(", ") || "—"}</li>
          {(profile.especies_aceptadas || profile.tamanos_aceptados || profile.etapas_aceptadas) && (
            <li>
              Acepta:{" "}
              {[
                profile.especies_aceptadas?.map((e) => ESPECIE_LABEL[e] ?? e).join(", "),
                profile.tamanos_aceptados?.map((t) => TAMANO_LABEL[t] ?? t).join(", "),
                profile.etapas_aceptadas?.map((et) => ETAPA_LABEL[et] ?? et).join(", "),
              ]
                .filter(Boolean)
                .join(" · ")}
            </li>
          )}
          {profile.tiene_mascotas_propias != null && (
            <li>
              {profile.tiene_mascotas_propias
                ? "Tiene mascotas propias"
                : "No tiene mascotas propias"}
            </li>
          )}
          {domicilioCompleto && (
            <li>
              Domicilio: {domicilioCompleto}
              {profile.tipo_vivienda &&
                ` · ${TIPO_VIVIENDA_LABEL[profile.tipo_vivienda] ?? profile.tipo_vivienda}`}
              {profile.tiene_patio ? " · con patio" : ""}
            </li>
          )}
          {domicilioCompleto && !profile.domicilio_lat && (
            <li className="text-amber-600">
              Todavía no ubicaste tu domicilio en el mapa — sin eso no
              aparecés en la búsqueda por radio de los dueños.
            </li>
          )}
        </ul>
      </div>
      <button
        onClick={() => setEditing(true)}
        className="mt-3 rounded-lg border border-foreground/20 px-3 py-1.5 text-sm font-semibold transition hover:bg-foreground/5"
      >
        Editar perfil
      </button>
    </div>
  );
}
