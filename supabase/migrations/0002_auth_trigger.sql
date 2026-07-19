-- Pimi — trigger que crea automáticamente una fila en public.profiles
-- cada vez que se crea un usuario en auth.users (sea desde el dashboard,
-- desde supabase.auth.signUp() en la app, o desde la Admin API).
--
-- Sin esto, cada usuario nuevo requiere un insert manual en profiles,
-- que es justo el problema que causó que /admin, /dashboard y /cuidador
-- no encontraran datos después de crear usuarios "a mano" en el
-- dashboard.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, roles)
  values (new.id, new.email, '{}')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
