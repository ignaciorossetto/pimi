-- Pimi — liquidaciones (pagos manuales del equipo a los cuidadores)
--
-- Contexto (ver 0009_payments_mercadopago.sql): Pimi cobra el 100% del
-- monto de cada reserva a su propia cuenta de Mercado Pago. Cuando un
-- pago pasa a "liberado" (ver liberar-pago/route.ts), lo único que
-- significa es "ya podemos pagarle al cuidador su parte" — la
-- transferencia real la hace un admin a mano por fuera de la app, y hasta
-- ahora no quedaba ningún registro de eso adentro de Pimi.
--
-- Esta migración agrega el registro de esas transferencias ("liquidación"
-- = un pago del equipo a un cuidador, que puede juntar varias reservas
-- liberadas en una sola transferencia) y el comprobante que la respalda.
--
-- Modelo:
--   1. Un admin junta uno o más "payments" en estado 'liberado' de un
--      mismo cuidador que todavía no estén en ninguna liquidación
--      (liquidacion_items.payment_id es unique — un pago no puede
--      liquidarse dos veces) y crea una liquidación en estado 'pendiente'.
--   2. Cuando hace la transferencia real (home banking, por fuera de la
--      app), sube el comprobante y la marca 'pagada'.
--   3. El cuidador ve todo esto de solo lectura en /cuidador/pagos.

create table public.liquidaciones (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null references public.profiles (id),
  monto_total numeric(10, 2) not null,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'pagada')),
  medio_pago text
    check (medio_pago in ('transferencia_bancaria', 'efectivo', 'otro')),
  comprobante_url text,
  notas_admin text,
  creado_por uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  pagada_at timestamptz
);

alter table public.liquidaciones enable row level security;

create policy "liquidaciones: select own"
  on public.liquidaciones for select
  using (auth.uid() = caregiver_id);

-- Sin policies de insert/update/delete para "authenticated" a propósito
-- — el admin arma y marca pagada una liquidación siempre con el cliente
-- de service role (ver app/api/admin/liquidaciones/*), mismo criterio que
-- "payments" (0009) y liberar-pago/route.ts. Un cuidador nunca puede
-- crear ni modificar sus propias liquidaciones.

create index idx_liquidaciones_caregiver on public.liquidaciones (caregiver_id);
create index idx_liquidaciones_estado on public.liquidaciones (estado);

-- ============================================================
-- liquidacion_items — qué reservas/pagos entraron en cada liquidación
-- ============================================================
create table public.liquidacion_items (
  id uuid primary key default gen_random_uuid(),
  liquidacion_id uuid not null references public.liquidaciones (id) on delete cascade,
  payment_id uuid not null references public.payments (id),
  monto numeric(10, 2) not null, -- la parte del cuidador (monto - comision_pimi), congelada al momento de liquidar
  created_at timestamptz not null default now(),
  unique (payment_id)
);

alter table public.liquidacion_items enable row level security;

create policy "liquidacion_items: select own"
  on public.liquidacion_items for select
  using (
    exists (
      select 1 from public.liquidaciones l
      where l.id = liquidacion_items.liquidacion_id
        and l.caregiver_id = auth.uid()
    )
  );

create index idx_liquidacion_items_liquidacion on public.liquidacion_items (liquidacion_id);
create index idx_liquidacion_items_payment on public.liquidacion_items (payment_id);

-- ============================================================
-- crear_liquidacion — arma una liquidación + sus items en una sola
-- transacción. Se valida todo ACÁ (no solo en el route handler que la
-- llama) para que no pueda colarse una carrera entre dos liquidaciones
-- armándose casi al mismo tiempo con el mismo pago — el unique de
-- liquidacion_items.payment_id ya lo impediría a nivel de fila, pero acá
-- se valida antes con mensajes claros en vez de un error crudo de
-- constraint, y todo el "juntar pagos + calcular total + insertar" queda
-- atómico (si algo fallara a mitad de camino, no queda una liquidación
-- fantasma sin items).
-- ============================================================
create or replace function public.crear_liquidacion(
  p_caregiver_id uuid,
  p_payment_ids uuid[],
  p_creado_por uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_liquidacion_id uuid;
  v_monto_total numeric(10, 2);
  v_count int;
begin
  if p_payment_ids is null or array_length(p_payment_ids, 1) is null then
    raise exception 'No se especificaron pagos para liquidar.';
  end if;

  select count(*) into v_count
    from public.payments
    where id = any(p_payment_ids);
  if v_count <> array_length(p_payment_ids, 1) then
    raise exception 'Alguno de los pagos elegidos no existe.';
  end if;

  if exists (
    select 1
    from public.payments p
    join public.bookings b on b.id = p.booking_id
    where p.id = any(p_payment_ids)
      and (b.caregiver_id <> p_caregiver_id or p.estado <> 'liberado')
  ) then
    raise exception 'Alguno de los pagos elegidos no está liberado o no es de este cuidador.';
  end if;

  if exists (
    select 1 from public.liquidacion_items li where li.payment_id = any(p_payment_ids)
  ) then
    raise exception 'Alguno de los pagos elegidos ya está en otra liquidación.';
  end if;

  select coalesce(sum(p.monto - p.comision_pimi), 0)
    into v_monto_total
    from public.payments p
    where p.id = any(p_payment_ids);

  insert into public.liquidaciones (caregiver_id, monto_total, creado_por)
  values (p_caregiver_id, v_monto_total, p_creado_por)
  returning id into v_liquidacion_id;

  insert into public.liquidacion_items (liquidacion_id, payment_id, monto)
  select v_liquidacion_id, p.id, (p.monto - p.comision_pimi)
  from public.payments p
  where p.id = any(p_payment_ids);

  return v_liquidacion_id;
end;
$$;

revoke execute on function public.crear_liquidacion(uuid, uuid[], uuid) from public, anon, authenticated;
grant execute on function public.crear_liquidacion(uuid, uuid[], uuid) to service_role;

-- ============================================================
-- Datos bancarios del cuidador — sin esto el admin no tiene, adentro de
-- la app, ningún dato de a dónde transferirle al momento de liquidar.
-- ============================================================
alter table public.caregiver_profiles
  add column if not exists cbu_alias text,
  add column if not exists titular_cuenta text;

-- Mismo mecanismo column-level de 0011/0017/0027: sin este grant
-- explícito, el propio cuidador no puede guardar estos dos campos nuevos
-- desde "Editar perfil" (el revoke general de 0011 bloquea cualquier
-- columna no listada, aunque la policy de fila lo permita).
grant update (cbu_alias, titular_cuenta) on public.caregiver_profiles to authenticated;

-- ============================================================
-- Storage: bucket privado para comprobantes de transferencia.
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'comprobantes-liquidacion',
  'comprobantes-liquidacion',
  false,
  8388608, -- 8MB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

-- Convención de path: "<caregiver_id>/<liquidacion_id>-archivo.ext". Solo
-- el cuidador dueño de esa carpeta puede leer su comprobante — el admin
-- lo sube con el cliente de service role (bypassea RLS de storage igual
-- que en toda la app), así que a propósito NO hay policy de insert acá:
-- es la imagen espejo de "verificaciones" (0015), donde el usuario sube y
-- el admin lee vía service role; acá el admin sube y el usuario lee.
create policy "comprobantes-liquidacion: owner select"
  on storage.objects for select
  using (
    bucket_id = 'comprobantes-liquidacion'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
