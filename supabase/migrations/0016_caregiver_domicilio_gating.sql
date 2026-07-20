-- Pimi — domicilio del cuidador + gating por verificación.
--
-- Decisión de producto: mientras el cuidador no está verificado (DNI +
-- domicilio aprobados por un admin), puede loguearse y armar su perfil,
-- pero NO aparece en búsquedas ni puede recibir reservas. Se implementa
-- en el punto más central posible: la vista pública que ya usan tanto
-- /buscar-cuidador como /cuidadores/[id].

alter table public.caregiver_profiles
  add column if not exists domicilio_calle text,
  add column if not exists domicilio_numero text,
  add column if not exists domicilio_piso_depto text,
  add column if not exists domicilio_barrio text,
  add column if not exists domicilio_ciudad text default 'Córdoba',
  add column if not exists tipo_vivienda text
    check (tipo_vivienda in ('casa', 'departamento', 'ph', 'otro')),
  add column if not exists tiene_patio boolean;

-- ============================================================
-- Vista pública: solo cuidadores verificados.
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
  cp.tipo_vivienda
from public.caregiver_profiles cp
join public.profiles p on p.id = cp.user_id
where cp.verificado = true;

grant select on public.caregiver_public_profiles to anon, authenticated;

-- ============================================================
-- Defensa en profundidad: aunque la vista pública ya oculta a los
-- cuidadores no verificados (con lo cual en la práctica nadie puede
-- "encontrarlos" para reservar), esto bloquea también un insert directo
-- a bookings apuntando a un caregiver_id no verificado si alguien lo
-- intenta a mano contra la API de Supabase.
-- ============================================================
drop policy if exists "bookings: insert as owner" on public.bookings;
create policy "bookings: insert as owner"
  on public.bookings for insert
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.caregiver_profiles cp
      where cp.user_id = bookings.caregiver_id
        and cp.verificado = true
    )
  );
