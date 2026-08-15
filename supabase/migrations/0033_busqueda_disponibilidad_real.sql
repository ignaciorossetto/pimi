-- Pimi — disponibilidad real en la búsqueda de cuidadores
-- (auditoría docs/05-auditoria-backlog.md, punto A5)
--
-- Hasta ahora la búsqueda mostraba cuidadores que ya tenían una reserva
-- confirmada superpuesta con las fechas buscadas — el dueño podía mandar
-- una solicitud condenada al rechazo (o directamente bloqueada por el
-- trigger de 0024, que no permite al cuidador aceptar dos cuidados
-- superpuestos). Ahora el RPC recibe las fechas del viaje y excluye a
-- esos cuidadores de entrada.
--
-- De paso se elimina el parámetro p_zona, muerto desde que el formulario
-- de búsqueda dejó de tener campo de zona (la búsqueda es por ubicación
-- + radio). Postgres trata cada lista de parámetros como una función
-- distinta, así que hay que dropear la firma vieja explícitamente — si
-- no, quedaría una versión huérfana conviviendo con la nueva (mismo
-- gotcha que ya documentó la migración 0027).

drop function if exists public.buscar_cuidadores(
  double precision, double precision, double precision, text, text, text, text, int
);

create or replace function public.buscar_cuidadores(
  p_lat double precision default null,
  p_lng double precision default null,
  p_radio_km double precision default null,
  p_servicio text default null,
  p_especie text default null,
  p_tamano text default null,
  p_edad int default null,
  p_desde date default null,
  p_hasta date default null
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
    and (p_servicio is null or p_servicio = '' or p_servicio = any(cp.tipos_de_servicio))
    and (p_especie is null or p_especie = any(cp.especies_aceptadas))
    and (p_tamano is null or p_tamano = any(cp.tamanos_aceptados))
    and (
      p_edad is null
      or public.etapa_vida_mascota(p_edad) is null
      or public.etapa_vida_mascota(p_edad) = any(cp.etapas_aceptadas)
    )
    -- Disponibilidad real: fuera los cuidadores con un cuidado confirmado
    -- (aceptado/en_curso) superpuesto con las fechas buscadas. Espejo de
    -- la regla del trigger de 0024 — mismo criterio de superposición.
    and (
      p_desde is null or p_hasta is null
      or not exists (
        select 1 from public.bookings b
        where b.caregiver_id = cp.user_id
          and b.estado in ('aceptado', 'en_curso')
          and b.fecha_inicio <= p_hasta
          and b.fecha_fin >= p_desde
      )
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
  double precision, double precision, double precision, text, text, text, int, date, date
) to anon, authenticated;
