"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMapType } from "leaflet";
import "leaflet/dist/leaflet.css";

const CORDOBA_CENTER: [number, number] = [-31.4201, -64.1888];

export type CuidadorMapa = {
  id: string;
  nombre: string | null;
  lat: number;
  lng: number;
  zona: string | null;
  tarifa_base: number;
  verificado: boolean;
  tier: string | null;
};

/**
 * Mapa interno de admin — a diferencia de CaregiverResultsMap (que usa la
 * ubicación DIFUMINADA para dueños buscando), este usa la ubicación REAL
 * de cada cuidador (domicilio_lat/domicilio_lng, columnas privadas). Solo
 * se llama desde /admin con el cliente service role, después de validar
 * rol admin en el layout — nunca exponer estas coordenadas reales a
 * cliente no-admin.
 *
 * Pensado para uso de marketing/operaciones: ver dónde hay densidad de
 * cuidadores y dónde hay "zonas vacías" en Córdoba para enfocar
 * campañas de reclutamiento.
 */
export function AdminCaregiverMap({
  cuidadores,
}: {
  cuidadores: CuidadorMapa[];
}) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMapType | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function init() {
      const L = (await import("leaflet")).default;
      if (cancelado || !mapDivRef.current) return;

      mapRef.current?.remove();

      const map = L.map(mapDivRef.current).setView(CORDOBA_CENTER, 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      const bounds: [number, number][] = [];

      cuidadores.forEach((c) => {
        const pos: [number, number] = [c.lat, c.lng];
        bounds.push(pos);
        L.circleMarker(pos, {
          radius: 7,
          color: "#fff",
          weight: 1.5,
          fillColor: c.verificado ? "#16a34a" : "#9ca3af",
          fillOpacity: 0.9,
        })
          .addTo(map)
          .bindPopup(
            `<strong>${c.nombre ?? "Cuidador Pimi"}</strong><br/>${
              c.zona ?? ""
            }<br/>$${c.tarifa_base} / día${
              c.tier ? ` · ${c.tier}` : ""
            }<br/><a href="/admin/cuidadores/${c.id}" style="color:#f97316">Ver perfil</a>`,
          );
      });

      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [30, 30] });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 14);
      }

      mapRef.current = map;
    }

    init();

    return () => {
      cancelado = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [cuidadores]);

  return (
    <div
      ref={mapDivRef}
      className="h-[28rem] w-full overflow-hidden rounded-2xl border border-background/15"
    />
  );
}
