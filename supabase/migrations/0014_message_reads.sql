-- Pimi — tracking de "último mensaje leído" por usuario y reserva.
--
-- No hay flag de leído/no leído por mensaje individual (eso obligaría a
-- actualizar N filas cada vez que alguien abre el chat). En cambio, cada
-- usuario tiene un timestamp por reserva ("hasta acá leí"), y un mensaje
-- se considera no leído si es de la otra parte y es más nuevo que ese
-- timestamp. Mismo patrón que usan Slack/WhatsApp Web internamente.

create table public.message_reads (
  booking_id uuid not null references public.bookings (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (booking_id, user_id)
);

alter table public.message_reads enable row level security;

create policy "message_reads: select own"
  on public.message_reads for select
  using (auth.uid() = user_id);

create policy "message_reads: upsert own as participant"
  on public.message_reads for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.bookings b
      where b.id = message_reads.booking_id
        and (auth.uid() = b.owner_id or auth.uid() = b.caregiver_id)
    )
  );

create policy "message_reads: update own"
  on public.message_reads for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_message_reads_user on public.message_reads (user_id);
