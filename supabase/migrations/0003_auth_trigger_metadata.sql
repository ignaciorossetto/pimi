-- Pimi — mejora el trigger de auth.users -> profiles para que use los
-- metadatos que manda el formulario de registro (rol, teléfono, y si es
-- cuidador: zona, tarifa, tipos de servicio, bio).
--
-- Por qué: si insertáramos estos datos desde el cliente después del
-- signUp(), fallaría en cualquier proyecto que pida confirmación de
-- email (no hay sesión activa todavía => RLS bloquea el insert). Al
-- leerlos acá, dentro del trigger (que corre con privilegios elevados,
-- "security definer"), funciona sin importar la configuración de
-- confirmación de email.
--
-- Reemplaza al trigger de 0002_auth_trigger.sql. Seguro correr esta
-- migración exista o no la anterior.

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

  insert into public.profiles (id, email, telefono, roles)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'telefono',
    v_roles
  )
  on conflict (id) do update
    set telefono = excluded.telefono,
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

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
