-- Pimi — limpieza de columnas muertas (auditoría docs/05-auditoria-backlog.md,
-- puntos B4, B5 y B6).
--
-- Tres columnas que NINGUNA parte de la app lee ni escribe:
--
--   B4. caregiver_profiles.disponibilidad (jsonb) — creada en 0001 para un
--       calendario de disponibilidad que nunca se construyó. Si esa feature
--       llega en v2, se diseñará con su propio esquema; dejar la columna
--       vacía solo invita a que dos features futuras la usen con formatos
--       distintos.
--
--   B5. caregiver_profiles.radio_cobertura_km — la búsqueda por radio usa
--       el radio que elige el DUEÑO al buscar (p_radio_km del RPC), nunca
--       este campo del cuidador. Quedó en el grant de 0011 y en la vista
--       pública sin que nadie lo consuma.
--
--   B6. bookings.estado_pago — redundante desde 0009: el estado real del
--       pago vive en payments.estado y nada lee ni escribe esta copia.
--       Dato duplicado = bug en potencia el día que se desincronicen.
--
-- Nota sobre la vista: caregiver_public_profiles incluye radio_cobertura_km,
-- así que no se puede dropear la columna sin tocarla. "create or replace
-- view" no permite ELIMINAR columnas (solo agregar al final, ver 0021), por
-- eso acá va drop view + create view. El drop invalida los grants de la
-- vista, se re-otorgan al final.

-- 1) Vista fuera (depende de radio_cobertura_km)
drop view if exists public.caregiver_public_profiles;

-- 2) Columnas muertas fuera
alter table public.caregiver_profiles
  drop column if exists disponibilidad,
  drop column if exists radio_cobertura_km;

alter table public.bookings
  drop column if exists estado_pago;

-- 3) Vista de nuevo, idéntica a la de 0027 pero sin radio_cobertura_km
create view public.caregiver_public_profiles as
select
  p.id,
  p.nombre,
  cp.zona,
  cp.bio,
  cp.tarifa_base,
  cp.tipos_de_servicio,
  cp.verificado,
  cp.foto,
  cp.tier,
  cp.reviews_count,
  cp.rating_promedio,
  cp.tiene_patio,
  cp.tipo_vivienda,
  fuzz.lat as zona_lat,
  fuzz.lng as zona_lng,
  cp.tiene_mascotas_propias,
  cp.tamanos_aceptados,
  cp.especies_aceptadas,
  cp.etapas_aceptadas
from public.caregiver_profiles cp
join public.profiles p on p.id = cp.user_id
left join lateral public.ubicacion_difuminada(cp.user_id, cp.domicilio_lat, cp.domicilio_lng) fuzz on true
where cp.verificado = true;

grant select on public.caregiver_public_profiles to anon, authenticated;
