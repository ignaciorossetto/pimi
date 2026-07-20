-- Pimi — fix: el cuidador no podía guardar su domicilio.
--
-- Bug: la migración 0011 restringe el UPDATE de caregiver_profiles a un
-- listado explícito de columnas (zona, bio, tarifa_base, tipos_de_servicio,
-- radio_cobertura_km, foto) para que un cuidador no pueda autoasignarse
-- tier/comision_pct/verificado. La migración 0016 agregó las columnas de
-- domicilio pero nunca las sumó a ese listado, así que cualquier UPDATE
-- del cuidador a su propio domicilio fallaba con "permission denied for
-- table caregiver_profiles" (42501), aunque la policy de RLS sí lo
-- permitía — el bloqueo era a nivel de columna, no de fila.
--
-- Fix: sumar las columnas de domicilio (todas no sensibles: no afectan
-- comisión, tier ni verificado) al grant existente.
grant update (
  domicilio_calle,
  domicilio_numero,
  domicilio_piso_depto,
  domicilio_barrio,
  domicilio_ciudad,
  tipo_vivienda,
  tiene_patio
) on public.caregiver_profiles to authenticated;
