-- Pimi — visibilidad cruzada entre las dos partes de una misma reserva.
--
-- Hasta ahora "profiles" y "pets" solo eran visibles para su propio
-- dueño. Pero una vez que hay una reserva real entre un dueño y un
-- cuidador, cada uno necesita ver lo básico del otro (nombre) y el
-- cuidador necesita ver los datos de la mascota que va a cuidar
-- (especie, temperamento, necesidades médicas) para poder hacer su
-- trabajo. Estas políticas solo aplican si existe una reserva real que
-- los conecta — no abren nada al público.

create policy "profiles: select booking participants"
  on public.profiles for select
  using (
    exists (
      select 1 from public.bookings b
      where (b.owner_id = profiles.id and b.caregiver_id = auth.uid())
         or (b.caregiver_id = profiles.id and b.owner_id = auth.uid())
    )
  );

create policy "pets: select if caregiver of a booking"
  on public.pets for select
  using (
    exists (
      select 1 from public.bookings b
      where b.pet_id = pets.id and b.caregiver_id = auth.uid()
    )
  );
