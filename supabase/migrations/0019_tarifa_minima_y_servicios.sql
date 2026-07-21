-- Pimi — precio mínimo por día y simplificación de tipos de servicio.
--
-- Decisiones de producto (a pedido explícito):
--   1. Precio mínimo de $8.000/día. Se permite 0 porque así queda el
--      valor por defecto de un perfil recién creado (todavía no cargó
--      tarifa) — lo que se bloquea es un precio positivo pero por debajo
--      del piso, no la ausencia de precio.
--   2. Se elimina "visita_a_domicilio" como tipo de servicio en el
--      frontend (solo quedan "paseo" y "hospedaje"). No hace falta
--      migración para esto: tipos_de_servicio nunca tuvo un check
--      constraint (ver 0001_init.sql), así que no hay nada que romper acá
--      a nivel de esquema. Se deja esta nota para que quede documentado
--      junto con el cambio de precio mínimo.

alter table public.caregiver_profiles
  add constraint caregiver_profiles_tarifa_minima
  check (tarifa_base = 0 or tarifa_base >= 8000);
