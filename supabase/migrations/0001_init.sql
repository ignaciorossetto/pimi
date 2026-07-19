-- Pimi — esquema inicial (MVP)
-- Referencia: docs/02-arquitectura-tecnica.md

-- ============================================================
-- profiles (extiende auth.users de Supabase)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  telefono text,
  roles text[] not null default '{}', -- 'dueño' | 'cuidador'
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: select own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles: insert own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ============================================================
-- identity_verifications
-- ============================================================
create table public.identity_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  tipo_documento text not null,
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'aprobado', 'rechazado')),
  revisado_por uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.identity_verifications enable row level security;

create policy "identity_verifications: select own"
  on public.identity_verifications for select
  using (auth.uid() = user_id);

create policy "identity_verifications: insert own"
  on public.identity_verifications for insert
  with check (auth.uid() = user_id);

-- Nota: aprobar/rechazar (update de estado) se hace con la service role
-- key desde un panel interno, no vía RLS de usuario final.

-- ============================================================
-- pets
-- ============================================================
create table public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  nombre text not null,
  especie text not null check (especie in ('perro', 'gato', 'otro')),
  raza text,
  tamano text check (tamano in ('chico', 'mediano', 'grande')),
  edad int,
  temperamento text,
  necesidades_medicas text,
  fotos text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.pets enable row level security;

create policy "pets: owner full access"
  on public.pets for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ============================================================
-- caregiver_profiles
-- ============================================================
create table public.caregiver_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  zona text not null,
  bio text,
  tarifa_base numeric(10, 2) not null default 0,
  tipos_de_servicio text[] not null default '{}',
  radio_cobertura_km numeric(5, 1),
  disponibilidad jsonb not null default '{}'::jsonb,
  verificado boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.caregiver_profiles enable row level security;

-- Los perfiles de cuidador son públicos (necesario para búsqueda y
-- perfiles públicos en /cuidadores/[id]).
create policy "caregiver_profiles: public read"
  on public.caregiver_profiles for select
  using (true);

create policy "caregiver_profiles: owner write"
  on public.caregiver_profiles for insert
  with check (auth.uid() = user_id);

create policy "caregiver_profiles: owner update"
  on public.caregiver_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- bookings
-- ============================================================
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id),
  caregiver_id uuid not null references public.profiles (id),
  pet_id uuid not null references public.pets (id),
  fecha_inicio date not null,
  fecha_fin date not null,
  estado text not null default 'solicitado'
    check (estado in ('solicitado', 'aceptado', 'en_curso', 'completado', 'cancelado', 'disputado')),
  monto numeric(10, 2) not null,
  estado_pago text not null default 'pendiente'
    check (estado_pago in ('pendiente', 'retenido', 'liberado', 'reembolsado')),
  created_at timestamptz not null default now(),
  check (fecha_fin >= fecha_inicio)
);

alter table public.bookings enable row level security;

create policy "bookings: select participants"
  on public.bookings for select
  using (auth.uid() = owner_id or auth.uid() = caregiver_id);

create policy "bookings: insert as owner"
  on public.bookings for insert
  with check (auth.uid() = owner_id);

create policy "bookings: update participants"
  on public.bookings for update
  using (auth.uid() = owner_id or auth.uid() = caregiver_id);

-- ============================================================
-- payments (solo lectura para usuarios; escritura vía service role)
-- ============================================================
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  proveedor text not null default 'mercado_pago',
  monto numeric(10, 2) not null,
  comision_pimi numeric(10, 2) not null default 0,
  estado text not null default 'retenido'
    check (estado in ('retenido', 'liberado', 'reembolsado')),
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;

create policy "payments: select participants"
  on public.payments for select
  using (
    exists (
      select 1 from public.bookings b
      where b.id = payments.booking_id
        and (auth.uid() = b.owner_id or auth.uid() = b.caregiver_id)
    )
  );

-- ============================================================
-- reviews
-- ============================================================
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  autor_id uuid not null references public.profiles (id),
  destinatario_id uuid not null references public.profiles (id),
  puntaje int not null check (puntaje between 1 and 5),
  comentario text,
  created_at timestamptz not null default now(),
  unique (booking_id, autor_id)
);

alter table public.reviews enable row level security;

-- Públicas para dar contexto de reputación en perfiles de cuidador.
create policy "reviews: public read"
  on public.reviews for select
  using (true);

create policy "reviews: insert participants of completed booking"
  on public.reviews for insert
  with check (
    auth.uid() = autor_id
    and exists (
      select 1 from public.bookings b
      where b.id = reviews.booking_id
        and b.estado = 'completado'
        and (auth.uid() = b.owner_id or auth.uid() = b.caregiver_id)
    )
  );

-- ============================================================
-- messages (chat ligado a una reserva)
-- ============================================================
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  autor_id uuid not null references public.profiles (id),
  contenido text not null,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "messages: select participants"
  on public.messages for select
  using (
    exists (
      select 1 from public.bookings b
      where b.id = messages.booking_id
        and (auth.uid() = b.owner_id or auth.uid() = b.caregiver_id)
    )
  );

create policy "messages: insert participants"
  on public.messages for insert
  with check (
    auth.uid() = autor_id
    and exists (
      select 1 from public.bookings b
      where b.id = messages.booking_id
        and (auth.uid() = b.owner_id or auth.uid() = b.caregiver_id)
    )
  );

-- ============================================================
-- events (analítica propia — activo de datos desde el día 1)
-- ============================================================
create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id),
  tipo_evento text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;

create policy "events: insert own"
  on public.events for insert
  with check (auth.uid() = user_id or user_id is null);

-- Sin policy de select para usuarios finales: la lectura de eventos es
-- interna (dashboards internos vía service role key).

-- ============================================================
-- índices básicos
-- ============================================================
create index idx_pets_owner on public.pets (owner_id);
create index idx_bookings_owner on public.bookings (owner_id);
create index idx_bookings_caregiver on public.bookings (caregiver_id);
create index idx_caregiver_profiles_zona on public.caregiver_profiles (zona);
create index idx_events_tipo on public.events (tipo_evento);
