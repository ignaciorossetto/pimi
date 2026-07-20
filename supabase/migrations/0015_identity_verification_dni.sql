-- Pimi — verificación de identidad real: DNI (frente/dorso), selfie y
-- comprobante de domicilio, revisados manualmente por un admin en v1.
--
-- No hay integración con un proveedor de KYC/reconocimiento facial real
-- todavía (Didit/Metamap, ya mencionados en docs/02-arquitectura-tecnica.md)
-- — eso requiere una cuenta con un proveedor externo que no se puede dar de
-- alta ni probar desde este entorno. Se deja la revisión manual como v1
-- funcional, con los documentos guardados de forma que el día de mañana
-- un proveedor real pueda reemplazar solo la función de "decisión"
-- (aprobar/rechazar) sin tocar el resto del flujo.

alter table public.identity_verifications
  add column if not exists dni_numero text,
  add column if not exists dni_frente text,
  add column if not exists dni_dorso text,
  add column if not exists selfie text,
  add column if not exists comprobante_domicilio text,
  add column if not exists notas_admin text;

-- ============================================================
-- Un cuidador no puede autoaprobarse ni autoasignarse un revisor.
-- ============================================================
-- La policy de insert ("identity_verifications: insert own", 0001_init.sql)
-- solo valida que auth.uid() = user_id — no impide que el propio cliente
-- mande estado='aprobado' en el insert. Este trigger ignora lo que venga
-- en esas columnas y siempre arranca en 'pendiente', sin revisor.
create or replace function public.forzar_verificacion_pendiente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.estado := 'pendiente';
  new.revisado_por := null;
  new.reviewed_at := null;
  return new;
end;
$$;

drop trigger if exists trg_forzar_verificacion_pendiente on public.identity_verifications;
create trigger trg_forzar_verificacion_pendiente
  before insert on public.identity_verifications
  for each row
  execute function public.forzar_verificacion_pendiente();

-- Un mismo DNI no puede estar "aprobado" en más de una cuenta a la vez
-- (evita que alguien rechazado se arme una cuenta nueva con el mismo
-- documento). No se restringe en 'pendiente'/'rechazado' para no romper
-- reintentos del mismo usuario.
create unique index if not exists idx_identity_verifications_dni_aprobado
  on public.identity_verifications (dni_numero)
  where estado = 'aprobado' and dni_numero is not null;

-- ============================================================
-- Storage: bucket PRIVADO (a diferencia de mascotas/cuidadores/checkins,
-- que son públicos). DNI, selfie y comprobante de domicilio son datos
-- sensibles — nunca deben quedar servidos por una URL pública fija.
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verificaciones',
  'verificaciones',
  false,
  8388608, -- 8MB, un poco más que el resto por si suben fotos de alta resolución del DNI
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Cada usuario puede subir/ver SOLO lo que está en su propia carpeta
-- (<user_id>/...). El admin no necesita policy acá: usa el cliente con
-- service role, que bypassea RLS de storage igual que el de la base.
create policy "verificaciones: owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'verificaciones'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "verificaciones: owner select"
  on storage.objects for select
  using (
    bucket_id = 'verificaciones'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
