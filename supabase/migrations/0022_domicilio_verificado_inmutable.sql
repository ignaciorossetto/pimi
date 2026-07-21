-- Pimi — el domicilio verificado no se puede editar directamente.
--
-- Decisión de producto (a pedido explícito): una vez que un cuidador está
-- verificado, su domicilio está respaldado por un comprobante de
-- domicilio revisado por un admin (ver migración 0015). Dejar que lo
-- edite libremente después rompería esa garantía — el próximo día podría
-- cambiar la dirección a una que nadie revisó. Si se muda de verdad, tiene
-- que pedir un cambio de domicilio (con comprobante nuevo) que un admin
-- vuelve a revisar antes de aplicarlo.
--
-- ============================================================
-- 1) Trigger: bloquea el UPDATE de las columnas de domicilio en
--    caregiver_profiles una vez que verificado = true. El service role
--    (panel de admin) sigue pudiendo tocarlo — así es como se aplica un
--    cambio de domicilio aprobado.
-- ============================================================
create or replace function public.bloquear_edicion_domicilio_verificado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.role() refleja el rol de quien hace el request (via PostgREST),
  -- no el dueño de la función. El service role key del panel de admin
  -- autentica como 'service_role' y siempre puede pasar.
  if auth.role() = 'service_role' then
    return new;
  end if;

  if old.verificado = true and (
    new.domicilio_calle is distinct from old.domicilio_calle or
    new.domicilio_numero is distinct from old.domicilio_numero or
    new.domicilio_piso_depto is distinct from old.domicilio_piso_depto or
    new.domicilio_barrio is distinct from old.domicilio_barrio or
    new.domicilio_ciudad is distinct from old.domicilio_ciudad or
    new.tipo_vivienda is distinct from old.tipo_vivienda or
    new.domicilio_lat is distinct from old.domicilio_lat or
    new.domicilio_lng is distinct from old.domicilio_lng
  ) then
    raise exception
      'Tu domicilio ya está verificado y no se puede editar directamente. Pedí un cambio de domicilio para que un admin lo revise.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_bloquear_edicion_domicilio_verificado on public.caregiver_profiles;
create trigger trg_bloquear_edicion_domicilio_verificado
  before update on public.caregiver_profiles
  for each row
  execute function public.bloquear_edicion_domicilio_verificado();

-- ============================================================
-- 2) Tabla de solicitudes de cambio de domicilio — mismo patrón que
--    identity_verifications: el cuidador manda domicilio nuevo +
--    comprobante nuevo, arranca en 'pendiente' siempre (no puede
--    autoaprobarse), un admin decide.
-- ============================================================
create table public.caregiver_address_change_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  domicilio_calle text not null,
  domicilio_numero text not null,
  domicilio_piso_depto text,
  domicilio_barrio text not null,
  domicilio_ciudad text not null default 'Córdoba',
  tipo_vivienda text not null check (tipo_vivienda in ('casa', 'departamento', 'ph', 'otro')),
  domicilio_lat double precision,
  domicilio_lng double precision,
  comprobante_domicilio text not null,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'aprobado', 'rechazado')),
  notas_admin text,
  revisado_por uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.caregiver_address_change_requests enable row level security;

create policy "address_change: select own"
  on public.caregiver_address_change_requests for select
  using (auth.uid() = user_id);

create policy "address_change: insert own"
  on public.caregiver_address_change_requests for insert
  with check (auth.uid() = user_id);

-- Mismo motivo que en identity_verifications (migración 0015): el insert
-- policy solo valida el dueño de la fila, no lo que manda en "estado" —
-- este trigger fuerza que siempre arranque pendiente, sin revisor.
create or replace function public.forzar_solicitud_domicilio_pendiente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.estado := 'pendiente';
  new.revisado_por := null;
  new.reviewed_at := null;
  return new;
end;
$$;

drop trigger if exists trg_forzar_solicitud_domicilio_pendiente on public.caregiver_address_change_requests;
create trigger trg_forzar_solicitud_domicilio_pendiente
  before insert on public.caregiver_address_change_requests
  for each row
  execute function public.forzar_solicitud_domicilio_pendiente();

-- El comprobante de domicilio nuevo va al mismo bucket privado que ya usa
-- la verificación de identidad ("verificaciones") — las policies de ese
-- bucket (owner insert/select por carpeta de usuario) ya cubren este caso,
-- no hace falta un bucket ni policies nuevas.
