-- Pimi — nombre público de usuario + vista pública de cuidador.
--
-- Hasta ahora "nombre" solo vivía en los metadatos de auth (visible
-- únicamente para el propio usuario). Para poder mostrar "reservá con
-- Juan" en resultados de búsqueda y en el perfil público del cuidador,
-- necesitamos un nombre consultable por otros usuarios — pero sin abrir
-- toda la tabla profiles (que tiene teléfono/email, datos privados).
--
-- Solución: columna nombre en profiles (poblada por el trigger) + una
-- vista que expone solo las columnas seguras de un cuidador.

alter table public.profiles add column if not exists nombre text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_roles text[];
  v_tipos_de_servicio text[];
begin
  v_roles := coalesce(
    array(
      select jsonb_array_elements_text(
        coalesce(new.raw_user_meta_data -> 'roles', '[]'::jsonb)
      )
    ),
    '{}'::text[]
  );

  insert into public.profiles (id, email, nombre, telefono, roles)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'nombre',
    new.raw_user_meta_data ->> 'telefono',
    v_roles
  )
  on conflict (id) do update
    set nombre = excluded.nombre,
        telefono = excluded.telefono,
        roles = excluded.roles;

  if 'cuidador' = any(v_roles) then
    v_tipos_de_servicio := coalesce(
      array(
        select jsonb_array_elements_text(
          coalesce(new.raw_user_meta_data -> 'tipos_de_servicio', '[]'::jsonb)
        )
      ),
      '{}'::text[]
    );

    insert into public.caregiver_profiles (
      user_id, zona, bio, tarifa_base, tipos_de_servicio
    )
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'zona', ''),
      new.raw_user_meta_data ->> 'bio',
      coalesce((new.raw_user_meta_data ->> 'tarifa_base')::numeric, 0),
      v_tipos_de_servicio
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

-- Vista pública: solo lo necesario para que un dueño evalúe y contacte
-- a un cuidador. Nunca expone teléfono ni email.
create or replace view public.caregiver_public_profiles as
select
  p.id,
  p.nombre,
  cp.zona,
  cp.bio,
  cp.tarifa_base,
  cp.tipos_de_servicio,
  cp.radio_cobertura_km,
  cp.verificado
from public.caregiver_profiles cp
join public.profiles p on p.id = cp.user_id;

grant select on public.caregiver_public_profiles to anon, authenticated;
