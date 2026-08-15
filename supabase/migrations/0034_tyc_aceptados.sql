-- Pimi — registro de aceptación de Términos y Condiciones
-- (auditoría docs/05-auditoria-backlog.md, punto A6)
--
-- El checkbox de aceptación existía en el registro pero no quedaba
-- registrado en ningún lado CUÁNDO aceptó cada usuario — y ante un
-- reclamo, poder probar la aceptación (fecha incluida) es exactamente lo
-- que importa. Un timestamp además deja rastro de QUÉ versión aceptó
-- (comparando contra la fecha de "última actualización" de /terminos).

alter table public.profiles
  add column if not exists tyc_aceptados_at timestamptz;

-- El alta con contraseña manda tyc_aceptado=true en los metadatos del
-- signUp — el trigger lo convierte en timestamp al crear el perfil. Las
-- cuentas de Google no pasan por acá con ese flag: aceptan en
-- /completar-perfil, que actualiza la columna directamente.
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

  insert into public.profiles (id, email, nombre, telefono, roles, tyc_aceptados_at)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'nombre',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    new.raw_user_meta_data ->> 'telefono',
    v_roles,
    case
      when (new.raw_user_meta_data ->> 'tyc_aceptado') = 'true' then now()
      else null
    end
  )
  on conflict (id) do update
    set nombre = excluded.nombre,
        telefono = excluded.telefono,
        roles = excluded.roles,
        tyc_aceptados_at = coalesce(public.profiles.tyc_aceptados_at, excluded.tyc_aceptados_at);

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
