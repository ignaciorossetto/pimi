# Pimi — Auditoría del proyecto y backlog

Versión 1 — 15 de agosto de 2026

Revisión completa del código, la base de datos y los flujos actuales. Dos partes: **(A) tareas pendientes** para completar la app, ordenadas por prioridad, y **(B) purga** de código, columnas y archivos que hoy no sirven.

---

## A. Tareas pendientes

### Prioridad 1 — Huecos que rompen promesas ya hechas en el producto

**A1. ✅ (migración 0031 + UI, 15/8) Flujo de "reportar un problema" (disputas).**
La promesa central del escrow es: "el pago se retiene 48hs por si reportás un problema". Ese texto ya se le muestra al dueño en la pantalla de pago, pero **no existe ningún botón ni flujo para reportar nada**. El estado `disputado` está definido en la base desde el día 1 y ninguna pantalla lo puede producir. Falta: botón "Reportar un problema" en la reserva (visible para el dueño mientras el pago esté retenido), que pase la reserva a `disputado`, congele la liberación del pago, y aparezca como alerta en el panel admin para resolver a mano.

**A2. ✅ (junto con A1, 15/8) Flujo de reembolso.**
El estado `reembolsado` existe en `payments` pero nada en toda la app lo setea jamás — ni el webhook de Mercado Pago procesa reembolsos, ni el admin tiene un botón para registrarlos. Sin esto, resolver una disputa a favor del dueño no se puede reflejar en el sistema. Falta: acción admin "marcar como reembolsado" (misma mecánica que liberar-pago), y opcionalmente manejar el estado `refunded` en el webhook.

**A3. ✅ (migración 0032 + endpoint de notificaciones, 15/8) Emails de eventos clave.**
La infraestructura de email (Resend + `notification_log`, idempotente) ya existe y funciona, pero **solo se usa para el cron de recordatorios**. Nadie se entera por email cuando: le llega una solicitud de reserva, se la aceptan/rechazan, se confirma un pago, el cuidador hace un check-in, le dejan una reseña, o se le paga una liquidación. Para un marketplace, el email de "te llegó una solicitud" es probablemente el más importante de todos — un cuidador que no entra a la app todos los días pierde reservas.

**A4. ✅ (cron ampliado, 15/8) Vencimiento de solicitudes viejas.**
Una solicitud en estado `solicitado` cuya `fecha_inicio` ya pasó queda viva para siempre (la migración 0024 solo auto-cancela solicitudes perdedoras cuando otra se confirma). Sumar al cron diario existente: cancelar automáticamente solicitudes vencidas con un `motivo_cancelacion` propio (ej. `vencida_sin_respuesta`), para que no ensucien los paneles de dueño y cuidador.

### Prioridad 2 — Completar el producto para el lanzamiento

**A5. ✅ (migración 0033, 15/8) Disponibilidad real en la búsqueda.**
Hoy la búsqueda no excluye cuidadores que ya tienen una reserva confirmada superpuesta con las fechas buscadas — el dueño puede mandar una solicitud condenada al rechazo. Extender el RPC `buscar_cuidadores` con `p_desde`/`p_hasta` y excluir cuidadores con bookings `aceptado`/`en_curso` superpuestos. (La columna `disponibilidad` jsonb, ver B4, es un tema aparte: calendario manual del cuidador, puede esperar a v2.)

**A6. ✅ (páginas + checkbox + migración 0034, 15/8 — pendiente revisión de abogado antes del lanzamiento) Páginas legales: Términos y Condiciones + Política de Privacidad.**
No existen. Para operar cobrando dinero y almacenando DNI + domicilios en Argentina son indispensables antes del lanzamiento (Ley 25.326 de protección de datos personales). Además el registro debería exigir aceptarlos con checkbox.

**A7. ✅ (migración 0035 + páginas, 15/8) Instrumentación de analítica propia.**
El pilar 3 del doc de producto ("datos que mejoran el match, activo desde el día 1") hoy está incumplido: la tabla `events` solo registra `mensaje_flageado`. Instrumentar los eventos del funnel: registro completado, mascota creada, búsqueda ejecutada (con filtros usados), perfil de cuidador visto, solicitud enviada, pago completado, reseña dejada. Es barato ahora y carísimo de reconstruir después.

**A8. ✅ (cron ampliado, 15/8) Notificar al admin cuando hay cosas que revisar.**
Las verificaciones de identidad, cambios de domicilio y (ahora) disputas dependen de que un admin entre a mirar el panel. Un email diario de resumen ("tenés 2 verificaciones y 1 disputa pendientes") usando el cron ya existente evita que un cuidador espere días por una verificación.

**A9. Editar datos básicos en /cuenta.**
Revisar que el usuario pueda corregir su nombre y teléfono desde "Mis datos" — hoy el nombre solo se captura en el registro/completar-perfil y no hay forma clara de corregirlo después.

**A10. SEO / metadata de páginas públicas.**
Solo existe el metadata global del layout raíz. La landing, `/para-cuidadores` y los perfiles públicos de cuidador deberían tener `generateMetadata` propio (título con el nombre del cuidador, descripción, Open Graph) — son las páginas que se van a compartir por WhatsApp y las que Google va a indexar. Directamente ligado al plan de GTM.

**A11. Seguridad: rate limiting en las APIs públicas.**
`/api/geocode` y `/api/precios-sugeridos` son endpoints abiertos que hacen trabajo por cada request. Sin límite de frecuencia son un vector fácil de abuso/costos. Un rate limit simple por IP (por ejemplo con Upstash o un contador en `app_settings`) alcanza para v1.

**A12. Seguridad: validar la firma del webhook de Mercado Pago.**
El webhook hoy se defiende re-consultando el pago a la API de MP (bien), pero MP ofrece además el header `x-signature` para validar el origen. Sumarlo es barato y cierra el vector de spam de requests al webhook.

### Prioridad 3 — Calidad y operación (post-lanzamiento temprano)

**A13. Monitoreo de errores (Sentry o similar).** Hoy los errores server-side solo van a `console.error` (logs de Vercel). Con usuarios reales hace falta enterarse de los errores sin ir a buscarlos.

**A14. Paginación en admin y listados.** Todas las tablas de admin y los listados de reservas cargan todo sin límite (salvo algunos `limit(10/50)`). Con cientos de registros va a doler. No urgente, pero anotarlo.

**A15. Reserva multi-mascota.** Ya discutido: una estadía con varias mascotas del mismo dueño en una sola casa. Requiere tabla intermedia mascota-reserva, decisión de tarifa y de compatibilidad. V2.

**A16. Tests automatizados mínimos.** No hay ni un test en el repo. Lo mínimo valioso: tests de las funciones puras (`calcularComision`, `safeNext`, `etapa_vida_mascota`) y de los triggers críticos de la base (compatibilidad de mascotas, bloqueo de domicilio, no-superposición de reservas) con pgTAP o un script SQL de smoke test.

---

## B. Purga

**B1. `docs/_synctest_delete_me.md`** ✅ (hecho 15/8) — archivo de prueba de sincronización, el propio nombre pide borrarlo.

**B2. `docs/Pimi_flujo_fondos_hosting.xlsx`** ✅ (hecho 15/8) — versión vieja, superseded por `_v2.xlsx`. Borrar la v1 (git conserva la historia igual).

**B3. ✅ (hecho 15/8) Paquete `packages/shared` (@pimi/shared) completo.**
Nadie lo importa — la única referencia en todo el código es el `transpilePackages` de `next.config.ts`. Además sus tipos quedaron desactualizados respecto del esquema real (no conocen tiers, preferencias, domicilio, liquidaciones...), o sea que si alguien los usara mañana, mentirían. Borrar el paquete, la entrada en `transpilePackages` y el workspace de npm. Si a futuro se quieren tipos compartidos, generarlos con `supabase gen types` en vez de mantenerlos a mano.

**B4. ✅ (migración 0030, 15/8) Columna `caregiver_profiles.disponibilidad` (jsonb).**
Creada en 0001, jamás leída ni escrita por ninguna parte de la app. Decisión: si el calendario de disponibilidad manual queda para v2 (recomendado), dropearla ahora y recrearla bien cuando se diseñe la feature — una columna muerta invita a que dos features futuras la usen con formatos distintos.

**B5. ✅ (migración 0030, 15/8) Columna `caregiver_profiles.radio_cobertura_km`.**
Cero usos en el código de la app (la búsqueda por radio usa el radio elegido por el DUEÑO, no este campo). Sigue en el grant de 0011 y en la vista pública. Dropearla de la tabla y de la vista (ojo: recrear la vista respetando la regla de "solo se pueden agregar columnas al final" — acá conviene `drop view` + `create view` limpia en una migración).

**B6. ✅ (migración 0030, 15/8) Columna `bookings.estado_pago`.**
Redundante desde la migración 0009: el estado real del pago vive en `payments.estado` y NADA del código lee ni escribe `bookings.estado_pago` (solo aparece en 0001 y en un doc). Es el típico dato duplicado que un día queda desincronizado y genera un bug confuso. Dropearla.

**B7. `docs/03-flujos-visuales.html`** ✅ (resuelto 15/8: se conserva, es un doc real de flujos visuales — falta solo commitearlo) — estaba sin trackear en git.

**B8. Purga pre-producción (checklist para el día del lanzamiento).**
Ya está todo con doble candado por `NODE_ENV`, pero conviene dejarlo escrito para ejecutar como checklist:
- Quitar `<ResetDevDataButton />` y su route `/api/admin/reset-db` + revocar la función `admin_truncate_test_data()` en la base.
- Quitar el toggle y endpoint de simulación de pagos (`SimulacionPagosToggle`, `/api/mercadopago/simular-pago`, `/api/admin/toggle-simulacion-pagos`) y la key `payments_simulation_mode` de `app_settings`.
- Correr el reset de datos de prueba por última vez.
- Verificar variables de entorno de producción: `MERCADOPAGO_ACCESS_TOKEN` real, `RESEND_API_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`.

**B9. Duplicación consciente a vigilar (no purgar, documentar).**
`lib/payments/tiers.ts` duplica los umbrales de la migración 0011, y `calcularComision` tiene un default (20%) que también vive en la base. Están comentados como copias manuales — está bien para v1, pero cada cambio de comisión/tiers debe tocar los dos lugares. Queda anotado como deuda conocida.

---

## Orden sugerido de ejecución

1. **Purga rápida** (B1, B2, B3, B7): 15 minutos, deja el repo limpio.
2. **Migración de limpieza de base** (B4, B5, B6) en una sola migración `0030_limpieza_columnas_muertas.sql`.
3. **A1 + A2 juntas** (disputa + reembolso): son las dos caras del mismo flujo.
4. **A3** (emails de eventos): el mayor impacto de producto por esfuerzo.
5. **A4 + A5** (solicitudes vencidas + disponibilidad real en búsqueda).
6. **A6** (legales) — bloqueante de lanzamiento, se puede hacer en paralelo.
7. **A7 + A8** (analítica + resumen admin).
8. Resto de prioridad 2 y 3 según se acerque el lanzamiento, cerrando con el checklist B8 el día que se salga a producción.
