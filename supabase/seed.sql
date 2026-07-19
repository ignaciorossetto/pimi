-- Pimi — usuarios base de prueba (SOLO desarrollo/testing).
--
-- Requiere haber corrido antes supabase/migrations/0005_profiles_nombre_and_public_view.sql.
--
-- PASO 1 (a mano, en el dashboard de Supabase):
-- Authentication > Users > Add user > "Create new user", para cada uno
-- de estos tres emails, con password "123" y el toggle
-- "Auto Confirm User" ACTIVADO. NO uses Table Editor para esto.
--   - admin@pimi.com
--   - owner0@pimi.com
--   - cuidador0@pimi.com
--
-- PASO 2: correr este script en el SQL Editor. Es seguro correrlo más
-- de una vez (usa upsert).
--
-- ADVERTENCIA: la contraseña "123" es intencionalmente débil, es
-- exclusivamente para probar los flujos de login/dashboard en local.
-- Antes de lanzar a producción, borrar estos tres usuarios o cambiarles
-- la contraseña desde Authentication > Users.

-- Marca a admin@pimi.com como admin (app_metadata, no editable por el
-- propio usuario).
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'admin@pimi.com';

-- Perfiles (upsert: si el trigger ya creó la fila base, esto la completa).
insert into public.profiles (id, email, nombre, roles)
select id, email, 'Admin Pimi', '{}'::text[]
from auth.users
where email = 'admin@pimi.com'
on conflict (id) do update set nombre = excluded.nombre, roles = excluded.roles;

insert into public.profiles (id, email, nombre, roles)
select id, email, 'Dueño de Prueba', array['dueño']
from auth.users
where email = 'owner0@pimi.com'
on conflict (id) do update set nombre = excluded.nombre, roles = excluded.roles;

insert into public.profiles (id, email, nombre, roles)
select id, email, 'Cuidador de Prueba', array['cuidador']
from auth.users
where email = 'cuidador0@pimi.com'
on conflict (id) do update set nombre = excluded.nombre, roles = excluded.roles;

-- Perfil de cuidador + verificación pendiente para cuidador0.
insert into public.caregiver_profiles (
  user_id, zona, bio, tarifa_base, tipos_de_servicio, radio_cobertura_km, verificado
)
select id, 'Belgrano, CABA',
  'Amante de los animales, disponible fines de semana y feriados.',
  8000, array['hospedaje', 'paseo'], 5, false
from auth.users
where email = 'cuidador0@pimi.com'
on conflict (user_id) do nothing;

insert into public.identity_verifications (user_id, tipo_documento, estado)
select id, 'dni', 'pendiente'
from auth.users
where email = 'cuidador0@pimi.com'
and not exists (
  select 1 from public.identity_verifications iv
  join auth.users u on u.id = iv.user_id
  where u.email = 'cuidador0@pimi.com'
);
