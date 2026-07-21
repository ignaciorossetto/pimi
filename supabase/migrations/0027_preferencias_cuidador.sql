-- Pimi — preferencias del cuidador sobre qué mascotas acepta cuidar
-- (tamaño, especie, etapa de vida). A pedido explícito: "que solo
-- acepten cuidar perros pequeños y medianos", etc.
--
-- Objetivo: filtrar esto ANTES de que el dueño mande una solicitud (en
-- la búsqueda), no después — que el cuidador la rechace manualmente es
-- la peor experiencia posible para ambos lados. Además queda como
-- defensa en el trigger de reservas, por si alguien llega a un perfil
-- directo (sin pasar por la búsqueda filtrada) o el cuidador cambia sus
-- preferencias después de que el dueño ya eligió.

-- ============================================================
-- 1) Columnas nuevas en caregiver_profiles, con default "acepta todo"
--    para que los cuidadores existentes no desaparezcan de la búsqueda
--    de golpe por no haber cargado esto todavía.
-- ============================================================
alter table public.caregiver_profiles
  add column if not exists tamanos_aceptados text[] not null default array['chico','mediano','grande'],
  add column if not exists especies_aceptadas text[] not null default array['perro','gato','otro'],
  add column if not exists etapas_aceptadas text[] not null default array['cachorro','adulto','senior'];

alter table public.caregiver_profiles
  drop constraint if exists caregiver_profiles_tamanos_aceptados_check,
  drop constraint if exists caregiver_profiles_especies_aceptadas_check,
  drop constraint if exists caregiver_profiles_etapas_aceptadas_check;

alter table public.caregiver_profiles
  add constraint caregiver_profiles_tamanos_aceptados_check
    check (tamanos_aceptados <@ array['chico','mediano','grande']::text[]),
  add constraint caregiver_profiles_especies_aceptadas_check
    check (especies_aceptadas <@ array['perro','gato','otro']::text[]),
  add constraint caregiver_profiles_etapas_aceptadas_check
    check (etapas_aceptadas <@ array['cachorro','adulto','senior']::text[]);

-- Mismo gotcha que ya nos pasó con domicilio (0017) y tiene_mascotas_propias
-- (0021): el revoke de update column-level de la migración 0011 bloquea
-- cualquier columna nueva hasta que se le da grant explícito.
grant update (tamanos_aceptados, especies_aceptadas, etapas_aceptadas)
  on public.caregiver_profiles to authenticated;

-- ============================================================
-- 2) Etapa de vida a partir de la edad (años). Aproximación simple y a
--    propósito universal (no depende de especie/raza) para no pedirle
--    un dato más al dueño al cargar la mascota — cachorro < 1 año,
--    adulto 1-7, senior 8+.
-- ============================================================
create or replace function public.etapa_vida_mascota(p_edad int)
returns text
language sql
immutable
as $$
  select case
    when p_edad is null then null
    when p_edad < 1 then 'cachorro'
    when p_edad <= 7 then 'adulto'
    else 'senior'
  end;
$$;

-- ============================================================
-- 3) Defensa en el trigger de reservas: si por lo que sea se intenta
--    crear una reserva incompatible (perfil directo, preferencias
--    cambiadas después de la búsqueda), se bloquea con un mensaje claro
--    en vez de dejar pasar la solicitud para que el cuidador la
--    rechace a mano. Corre solo en el INSERT (momento en que se crea la
--    solicitud) — no hace falta revalidar en updates posteriores.
-- ============================================================
create or replace function public.verificar_compatibilidad_mascota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_especie text;
  v_tamano text;
  v_edad int;
  v_especies_aceptadas text[];
  v_tamanos_aceptados text[];
  v_etapas_aceptadas text[];
  v_etapa text;
begin
  select especie, tamano, edad
    into v_especie, v_tamano, v_edad
  from public.pets
  where id = new.pet_id;

  select especies_aceptadas, tamanos_aceptados, etapas_aceptadas
    into v_especies_aceptadas, v_tamanos_aceptados, v_etapas_aceptadas
  from public.caregiver_profiles
  where user_id = new.caregiver_id;

  -- Sin datos de mascota o de preferencias del cuidador no se puede
  -- evaluar nada — no corresponde bloquear por falta de información.
  if v_especies_aceptadas is null then
    return new;
  end if;

  if v_especie is not null and not (v_especie = any(v_especies_aceptadas)) then
    raise exception
      'Este cuidador no acepta mascotas de esta especie.'
      using errcode = 'P0001';
  end if;

  if v_tamano is not null and not (v_tamano = any(v_tamanos_aceptados)) then
    raise exception
      'Este cuidador no acepta mascotas de este tamaño.'
      using errcode = 'P0001';
  end if;

  v_etapa := public.etapa_vida_mascota(v_edad);
  if v_etapa is not null and not (v_etapa = any(v_etapas_aceptadas)) then
    raise exception
      'Este cuidador no acepta mascotas de esta edad.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_verificar_compatibilidad_mascota on public.bookings;
create trigger trg_verificar_compatibilidad_mascota
  before insert on public.bookings
  for each row
  execute function public.verificar_compatibilidad_mascota();

-- ============================================================
-- 4) Vista pública: sumar las tres columnas al final (create or replace
--    view solo permite agregar columnas nuevas al final, ver el bug de
--    la migración 0021).
-- ============================================================
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
  cp.tiene_mascotas_propias,
  cp.tamanos_aceptados,
  cp.especies_aceptadas,
  cp.etapas_aceptadas
from public.caregiver_profiles cp
join public.profiles p on p.id = cp.user_id
left join lateral public.ubicacion_difuminada(cp.user_id, cp.domicilio_lat, cp.domicilio_lng) fuzz on true
where cp.verificado = true;

grant select on public.caregiver_public_profiles to anon, authenticated;

-- ============================================================
-- 5) buscar_cuidadores: sumar filtro por especie/tamaño/edad de la
--    mascota elegida. Se dropea la versión anterior (5 params) porque
--    Postgres trata una lista de parámetros distinta como una función
--    distinta — sin el drop quedaría una versión vieja huérfana.
-- ============================================================
drop function if exists public.buscar_cuidadores(
  double precision, double precision, double precision, text, text
);

create or replace function public.buscar_cuidadores(
  p_lat double precision default null,
  p_lng double precision default null,
  p_radio_km double precision default null,
  p_zona text default null,
  p_servicio text default null,
  p_especie text default null,
  p_tamano text default null,
  p_edad int default null
)
returns table (
  id uuid,
  nombre text,
  zona text,
  bio text,
  tarifa_base numeric,
  tipos_de_servicio text[],
  verificado boolean,
  foto text,
  tier text,
  reviews_count integer,
  rating_promedio numeric,
  tiene_patio boolean,
  tipo_vivienda text,
  zona_lat double precision,
  zona_lng double precision,
  distancia_km double precision
)
language sql
stable
security definer
set search_path = public
as $$
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
    case
      when p_lat is not null and p_lng is not null and fuzz.lat is not null then
        2 * 6371 * asin(sqrt(
          power(sin(radians(fuzz.lat - p_lat) / 2), 2) +
          cos(radians(p_lat)) * cos(radians(fuzz.lat)) *
          power(sin(radians(fuzz.lng - p_lng) / 2), 2)
        ))
      else null
    end as distancia_km
  from public.caregiver_profiles cp
  join public.profiles p on p.id = cp.user_id
  left join lateral public.ubicacion_difuminada(cp.user_id, cp.domicilio_lat, cp.domicilio_lng) fuzz on true
  where cp.verificado = true
    and (p_zona is null or p_zona = '' or cp.zona ilike '%' || p_zona || '%')
    and (p_servicio is null or p_servicio = '' or p_servicio = any(cp.tipos_de_servicio))
    and (p_especie is null or p_especie = any(cp.especies_aceptadas))
    and (p_tamano is null or p_tamano = any(cp.tamanos_aceptados))
    and (
      p_edad is null
      or public.etapa_vida_mascota(p_edad) is null
      or public.etapa_vida_mascota(p_edad) = any(cp.etapas_aceptadas)
    )
    and (
      p_lat is null or p_lng is null or p_radio_km is null
      or (
        cp.domicilio_lat is not null and cp.domicilio_lng is not null
        and 2 * 6371 * asin(sqrt(
             power(sin(radians(cp.domicilio_lat - p_lat) / 2), 2) +
             cos(radians(p_lat)) * cos(radians(cp.domicilio_lat)) *
             power(sin(radians(cp.domicilio_lng - p_lng) / 2), 2)
           )) <= p_radio_km
      )
    )
  order by distancia_km nulls last, cp.verificado desc;
$$;

grant execute on function public.buscar_cuidadores(
  double precision, double precision, double precision, text, text, text, text, int
) to anon, authenticated;
