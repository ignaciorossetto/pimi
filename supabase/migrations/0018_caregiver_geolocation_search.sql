-- Pimi — búsqueda de cuidadores por mapa y radio, con ubicación difuminada.
--
-- Decisión de producto (a pedido explícito): en vez de una búsqueda de
-- texto libre por "zona", el dueño ve un mapa con círculos aproximados de
-- cada cuidador cerca suyo. La ubicación REAL del cuidador (domicilio_lat/
-- domicilio_lng) nunca se expone a un cliente — ni en la vista pública, ni
-- en la búsqueda. Lo único que sale de la base es un punto "difuminado"
-- desplazado unos cientos de metros.
--
-- ============================================================
-- Coordenadas reales del domicilio: columnas privadas.
-- ============================================================
alter table public.caregiver_profiles
  add column if not exists domicilio_lat double precision,
  add column if not exists domicilio_lng double precision;

-- Igual que con las columnas de domicilio de texto (ver migración 0017 y
-- el bug que causó): sin este grant explícito, el revoke/grant column-level
-- de 0011 bloquea que el propio cuidador guarde su ubicación.
grant update (domicilio_lat, domicilio_lng) on public.caregiver_profiles to authenticated;

-- ============================================================
-- Ubicación difuminada: offset FIJO por cuidador (no aleatorio por
-- request). Esto es deliberado — si el offset cambiara en cada consulta,
-- alguien podría promediar muchas consultas y reconstruir la ubicación
-- real (ataque de triangulación). Al ser siempre el mismo punto para un
-- mismo cuidador, el "borrón" es consistente pero nunca revela la
-- posición exacta. Radio del offset: entre 150 y 450 metros, ángulo
-- 0-360°, ambos derivados de un hash del user_id (no de nada que cambie).
-- ============================================================
create or replace function public.ubicacion_difuminada(
  p_user_id uuid,
  p_lat double precision,
  p_lng double precision
)
returns table (lat double precision, lng double precision)
language sql
immutable
as $$
  select
    p_lat + (
      (150 + (abs(hashtext(p_user_id::text)) % 300))
      / 111320.0
    ) * cos(radians((abs(hashtext(p_user_id::text || ':angulo')) % 360)::double precision)) as lat,
    p_lng + (
      (150 + (abs(hashtext(p_user_id::text)) % 300))
      / (111320.0 * greatest(cos(radians(p_lat)), 0.01))
    ) * sin(radians((abs(hashtext(p_user_id::text || ':angulo')) % 360)::double precision)) as lng
  where p_lat is not null and p_lng is not null;
$$;

-- ============================================================
-- Vista pública: sumar la ubicación difuminada (para mostrar el círculo
-- en la página de perfil del cuidador). Reemplaza la vista de la
-- migración 0016 completa porque create or replace view no permite
-- agregar columnas en el medio, solo al final — se repite tal cual más
-- las dos columnas nuevas.
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
  fuzz.lng as zona_lng
from public.caregiver_profiles cp
join public.profiles p on p.id = cp.user_id
left join lateral public.ubicacion_difuminada(cp.user_id, cp.domicilio_lat, cp.domicilio_lng) fuzz on true
where cp.verificado = true;

grant select on public.caregiver_public_profiles to anon, authenticated;

-- ============================================================
-- Búsqueda por radio: RPC en vez de un simple filtro de vista, porque
-- necesita comparar contra la coordenada REAL del cuidador (para que el
-- radio sea preciso) sin exponerla nunca en la respuesta.
--
-- Nota de seguridad adicional: la distancia que se devuelve al cliente se
-- calcula desde el punto DIFUMINADO, no desde el real — si devolviéramos
-- la distancia exacta al punto real, alguien podría buscar desde varios
-- puntos de referencia distintos y triangular la ubicación exacta aunque
-- nunca reciba la coordenada real directamente (mismo principio que
-- justifica el offset fijo de arriba). El filtro de "está dentro del
-- radio" sí usa la coordenada real, porque ahí la precisión importa más
-- que el riesgo (es una decisión booleana, no un número exacto).
-- ============================================================
create or replace function public.buscar_cuidadores(
  p_lat double precision default null,
  p_lng double precision default null,
  p_radio_km double precision default null,
  p_zona text default null,
  p_servicio text default null
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
    and (
      -- Si no hay búsqueda por radio (no se mandó lat/lng/radio), no se
      -- filtra por geo — se comporta como antes, solo por zona/servicio.
      -- Pero si SÍ hay búsqueda por radio, un cuidador sin coordenadas
      -- cargadas queda afuera (no "pasa igual" sin filtrar): no se puede
      -- confirmar que esté en el radio, así que no corresponde mostrarlo
      -- en un resultado que promete "cerca tuyo".
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
  double precision, double precision, double precision, text, text
) to anon, authenticated;
