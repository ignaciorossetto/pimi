-- Pimi — profiles.nombre queda vacío para cuentas creadas con Google.
--
-- El trigger handle_new_user() (migración 0005) solo lee
-- raw_user_meta_data->>'nombre', que es el campo que manda RegisterForm
-- en el alta con contraseña. Google nunca manda "nombre" — manda
-- "full_name" y "name" — así que cualquier cuenta creada con el login
-- de Google (ver /auth/callback y CompletarPerfilForm) quedaba con
-- profiles.nombre en null para siempre. Eso es lo que hacía que el
-- panel admin (que lee profiles.nombre, no los metadatos de auth) no
-- mostrara el nombre de esos usuarios.
--
-- CompletarPerfilForm ahora también pide y guarda el nombre
-- explícitamente (mejor dato que confiar en lo que mande Google), pero
-- esto queda como red de seguridad para cualquier cuenta que no pase
-- por ese paso, y esta migración además arregla retroactivamente las
-- cuentas ya creadas.

-- ============================================================
-- 1) Fallback en el trigger: si no vino "nombre" (alta con contraseña),
--    usar "full_name" o "name" (Google) antes de dejarlo vacío.
-- ============================================================
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
    coalesce(
      new.raw_user_meta_data ->> 'nombre',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
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

-- ============================================================
-- 2) Backfill: arreglar retroactivamente las cuentas ya creadas con
--    Google que quedaron con nombre en null.
-- ============================================================
update public.profiles p
set nombre = coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name')
from auth.users u
where u.id = p.id
  and p.nombre is null
  and coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name') is not null;
