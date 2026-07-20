"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMapType } from "leaflet";
import "leaflet/dist/leaflet.css";

const CORDOBA_CENTER: [number, number] = [-31.4201, -64.1888];

export type ResultadoMapa = {
  id: string;
  nombre: string | null;
  zona_lat: number | null;
  zona_lng: number | null;
  tarifa_base: number;
  verificado: boolean;
  perfilHref: string;
};

/**
 * Mapa de resultados de /buscar-cuidador. Cada cuidador se dibuja como un
 * CÍRCULO (no un pin puntual) sobre su ubicación ya difuminada por el
 * servidor (ver migración 0018) — reforzando visualmente que es un área
 * aproximada, no la dirección exacta. El centro de búsqueda del dueño
 * (si hay) se muestra con un pin + el círculo del radio elegido.
 */
export function CaregiverResultsMap({
  results,
  centerLat,
  centerLng,
  radioKm,
}: {
  results: ResultadoMapa[];
  centerLat?: number | null;
  centerLng?: number | null;
  radioKm?: number | null;
}) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMapType | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function init() {
      const L = (await import("leaflet")).default;
      if (cancelado || !mapDivRef.current) return;

      // Si el mapa ya existía (búsqueda anterior), se destruye y se arma
      // de nuevo — más simple y confiable que tratar de mutar capas.
      mapRef.current?.remove();

      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
        ._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const centro: [number, number] =
        centerLat != null && centerLng != null
          ? [centerLat, centerLng]
          : CORDOBA_CENTER;

      const map = L.map(mapDivRef.current).setView(
        centro,
        centerLat != null ? 13 : 12,
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      const bounds: [number, number][] = [];

      if (centerLat != null && centerLng != null) {
        L.marker(centro).addTo(map).bindPopup("Tu ubicación de búsqueda");
        bounds.push(centro);
        if (radioKm) {
          L.circle(centro, {
            radius: radioKm * 1000,
            color: "#f97316",
            weight: 1,
            fillOpacity: 0.04,
          }).addTo(map);
        }
      }

      results.forEach((r) => {
        if (r.zona_lat == null || r.zona_lng == null) return;
        const pos: [number, number] = [r.zona_lat, r.zona_lng];
        bounds.push(pos);
        L.circle(pos, {
          radius: 300,
          color: r.verificado ? "#16a34a" : "#9ca3af",
          weight: 2,
          fillOpacity: 0.25,
        })
          .addTo(map)
          .bindPopup(
            `<strong>${r.nombre ?? "Cuidador Pimi"}</strong><br/>$${r.tarifa_base} / día<br/><a href="${r.perfilHref}" style="color:#f97316">Ver perfil</a>`,
          );
      });

      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [30, 30] });
      }

      mapRef.current = map;
    }

    init();

    return () => {
      cancelado = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [results, centerLat, centerLng, radioKm]);

  return (
    <div
      ref={mapDivRef}
      className="h-80 w-full overflow-hidden rounded-2xl border border-foreground/10"
    />
  );
}
