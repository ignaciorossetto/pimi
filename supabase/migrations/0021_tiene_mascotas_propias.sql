-- Pimi — casilla "¿tenés mascotas propias?" en el perfil de cuidador.
--
-- Señal de confianza para el dueño: saber si en la casa donde va a quedar
-- su mascota (hospedaje) ya conviven otras mascotas del cuidador.

alter table public.caregiver_profiles
  add column if not exists tiene_mascotas_propias boolean;

-- Mismo bug que ya pasó con las columnas de domicilio (migraciones 0017 y
-- 0018): el revoke/grant column-level de 0011 bloquea cualquier columna
-- nueva que no se sume acá explícitamente.
grant update (tiene_mascotas_propias) on public.caregiver_profiles to authenticated;

-- Vista pública: se agrega al final (create or replace view no permite
-- insertar columnas en el medio del select existente).
create or replace view public.caregiver_public_profiles as
select
  p.id,
  p.nombre,
  cp.zona,
  cp.bio,
  cp.tarifa_base,
  cp.tipos_de_servicio,
  cp.radio_cobertura_km,
  cp.verificado,
  cp.foto,
  cp.tier,
  cp.reviews_count,
  cp.rating_promedio,
  cp.tiene_patio,
  cp.tipo_vivienda,
  fuzz.lat as zona_lat,
  fuzz.lng as zona_lng,
  cp.tiene_mascotas_propias
from public.caregiver_profiles cp
join public.profiles p on p.id = cp.user_id
left join lateral public.ubicacion_difuminada(cp.user_id, cp.domicilio_lat, cp.domicilio_lng) fuzz on true
where cp.verificado = true;

grant select on public.caregiver_public_profiles to anon, authenticated;
