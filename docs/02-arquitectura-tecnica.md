# Pimi — Arquitectura Técnica (MVP)

Versión 1 — 15 de julio de 2026

Este documento define el stack y la estructura técnica inicial. Objetivo: robusto, simple de mantener por un equipo chico, seguro por defecto, y que no nos frene para iterar rápido.

## 1. Stack propuesto

| Capa | Elección | Por qué |
|---|---|---|
| Frontend web | Next.js (React) + TypeScript | Web app responsive, SSR/SEO para landing y perfiles públicos de cuidadores (importante para marketing/SEO), ecosistema maduro. |
| Estilos/UI | Tailwind CSS + shadcn/ui | Velocidad de desarrollo, consistencia visual, fácil de mantener diseño cuidado sin equipo de diseño grande. |
| Backend/DB | Supabase (Postgres + Auth + Storage + Row Level Security) | Autenticación, base de datos relacional y storage de archivos (fotos, DNI) en un solo proveedor. RLS nativo da seguridad a nivel de fila sin reinventar autorización. Evita mantener backend propio en etapa MVP. |
| Pagos | Mercado Pago (Argentina) | Estándar de facto en AR, soporta escrow-like (retención) vía "pago con liberación diferida" o modelo propio de retención manual en v1. |
| Hosting frontend | Vercel | Integración directa con Next.js, deploys automáticos, HTTPS gestionado. |
| Notificaciones | Resend o similar (email) + push web (fase 2) | Simplicidad, buena entrega. |
| Verificación de identidad | Proveedor de KYC (ej. Didit, Metamap) o proceso manual v1 | Automatizar apenas el volumen lo justifique; en v1 puede ser revisión manual de DNI + selfie para no bloquear el lanzamiento. |
| Analítica / datos | Postgres (Supabase) + tabla de eventos propia desde el día 1 | Nos permite construir el activo de datos mencionado en el doc de producto sin depender de terceros desde el inicio. |

Este stack prioriza time-to-market y seguridad razonable para un MVP. Se puede migrar backend a algo más custom (ej. servicios separados) cuando el volumen lo justifique.

## 2. Estructura de carpetas (monorepo simple)

```
pimi/
├── apps/
│   └── web/                # Next.js app
│       ├── app/             # App Router: rutas y páginas
│       │   ├── (public)/    # Landing, perfiles públicos, SEO
│       │   ├── (auth)/      # Login, registro
│       │   └── (dashboard)/ # Área logueada: dueño y cuidador
│       ├── components/
│       ├── lib/              # clientes (supabase, mercadopago), helpers
│       └── styles/
├── packages/
│   └── shared/               # tipos TS compartidos, validaciones (zod)
├── supabase/
│   ├── migrations/           # SQL versionado del esquema
│   └── seed.sql
└── docs/                      # este documento y el de producto
```

## 3. Modelo de datos inicial (simplificado)

- **users**: id, email, teléfono, rol(es) [dueño/cuidador], estado de verificación, creado_en.
- **identity_verifications**: user_id, tipo de documento, estado (pendiente/aprobado/rechazado), revisor, fecha.
- **pets**: id, owner_id, nombre, especie, raza, tamaño, edad, temperamento, necesidades_medicas, fotos.
- **caregiver_profiles**: user_id, zona, bio, tarifa_base, tipos_de_servicio[], radio_cobertura, disponibilidad.
- **bookings**: id, owner_id, caregiver_id, pet_id, fecha_inicio, fecha_fin, estado [solicitado/aceptado/en_curso/completado/cancelado/disputado], monto, estado_pago.
- **payments**: booking_id, proveedor, monto, comisión_pimi, estado (retenido/liberado/reembolsado).
- **reviews**: booking_id, autor_id, destinatario_id, puntaje, comentario.
- **messages**: booking_id, autor_id, contenido, creado_en (chat mínimo ligado a una reserva, no chat abierto sin contexto — reduce riesgo de spam/scam).
- **events** (analítica propia): user_id, tipo_evento, metadata (jsonb), creado_en — para alimentar el activo de datos desde el día 1.

Todas las tablas con RLS: un dueño solo ve sus mascotas y reservas; un cuidador solo ve las reservas donde participa; nadie ve documentos de verificación de otro usuario salvo un rol "admin".

## 4. Seguridad (lineamientos concretos)

- **RLS en cada tabla** desde la primera migración, no como parche posterior.
- **Nunca guardar datos de tarjetas**: todo pago pasa por Mercado Pago (PCI compliance delegado).
- **Documentos de identidad** en bucket de Storage privado, acceso solo vía URL firmada de corta duración, nunca público.
- **Minimización de datos**: la dirección exacta del dueño no se muestra al cuidador hasta que la reserva está confirmada y paga.
- **Rate limiting** en endpoints de autenticación y búsqueda para evitar scraping/abuso.
- **Logs de auditoría** en acciones sensibles (cambios de estado de reserva, liberación de pagos, aprobación de verificación).
- **Dependencias**: escaneo automático de vulnerabilidades (ej. `npm audit` / Dependabot) en CI.
- **Variables de entorno / secretos**: nunca en el repo; usar el manejo de secretos de Vercel/Supabase.

### 4.1 Modelo de pagos con Mercado Pago (implementado)

Se implementó la primera versión del flujo de pago/retención. Decisiones
concretas, para que quede registrado el por qué:

- **Checkout Pro (redirect), no Checkout API con formulario propio**: el
  dueño paga en la página de Mercado Pago, no en la nuestra. Evita que
  Pimi toque datos de tarjeta en algún momento (fuera de scope de PCI por
  completo, no solo "delegado").
- **Sin split payments/marketplace_fee**: se evaluó usar el modelo de
  marketplace de MP (reparto automático dueño→cuidador vía OAuth por
  cuidador), pero ese modelo deposita la parte del cuidador en su cuenta
  de MP casi de inmediato — no permite retenerla hasta 48hs después de
  terminado el cuidado, que es el requisito de negocio. En cambio: Pimi
  cobra el 100% a su propia cuenta de Mercado Pago, y el estado
  "retenido"/"liberado" se controla enteramente desde nuestra tabla
  `payments`, no desde MP.
- **Pago al cuidador (su parte) es manual en v1**: cuando el admin marca
  un pago como "liberado" en el panel, eso es un registro de que el
  equipo ya le transfirió la plata al cuidador por fuera de la app
  (transferencia bancaria o MP persona a persona). No hay un payout
  automático todavía — para eso sí haría falta integrar la cuenta del
  cuidador (OAuth de MP o alias/CBU), que se puede sumar más adelante sin
  romper lo que ya existe, porque el estado sigue viviendo en `payments`.
- **Webhook no confía en el body de la notificación**: ante cualquier
  notificación de pago, el servidor vuelve a consultar el pago real a la
  API de Mercado Pago con el access token propio antes de marcar nada
  como retenido. Así un POST falso a la URL del webhook no puede fabricar
  un pago aprobado.
- **Explícitamente fuera de scope**: invertir el dinero retenido en algún
  fondo mientras está en tránsito. Gestionar/invertir fondos de terceros
  tiene marco regulatorio propio en Argentina (BCRA como regulador de
  proveedores de servicios de pago, CNV para instrumentos de inversión) —
  no es algo para implementar sin asesoramiento legal específico primero.
  Ver también la nota equivalente en `docs/01-producto-mvp.md`.

### 4.2 Sistema de recordatorios (implementado)

Recordatorios por email a dueño y cuidador 3 días, 1 día, y el mismo día
antes de que empiece un cuidado ya confirmado y pagado (no tiene sentido
recordarle a nadie algo que ni siquiera se pagó).

- **Envío**: Resend vía REST directo (sin SDK, un solo POST) —
  `apps/web/lib/notifications/email.ts`. Si `RESEND_API_KEY` no está
  configurada, no rompe nada: solo loguea y no manda el mail.
- **Disparo**: un cron de Vercel (`apps/web/vercel.json`) le pega una vez
  por día a `/api/cron/recordatorios`. Protegido con `CRON_SECRET` — Vercel
  manda ese valor solo si la env var está configurada en el proyecto, no
  hay que armar la autenticación a mano.
- **Sin duplicados**: cada envío se registra en `notification_log`
  (booking + destinatario + tipo de recordatorio, con constraint unique),
  así que si el cron se reintenta no manda el mismo mail dos veces.
- **Límite conocido**: al correr una vez por día, si un envío falla un día
  puntual (ej. Resend caído), se pierde esa ventana — el cron de mañana ya
  va a estar buscando el recordatorio de "1 día antes", no reintenta el de
  "3 días antes". Para v1 alcanza; si hace falta más confiabilidad conviene
  sumar reintentos con backoff o correr el cron más de una vez al día.
- **Pendiente real para que esto ande en producción**: crear cuenta en
  Resend, verificar un dominio propio (o probar primero con el sender de
  pruebas `onboarding@resend.dev`, que solo entrega a la cuenta dueña de
  la API key) y cargar `RESEND_API_KEY` / `CRON_SECRET` en las env vars
  del proyecto de Vercel.

## 5. Roadmap de implementación por fases

**Fase 0 — Fundaciones**
Setup del repo, Supabase, esquema inicial con RLS, autenticación, deploy en Vercel con landing básica.

**Fase 1 — Perfiles y búsqueda**
Alta de mascota, alta de perfil de cuidador, búsqueda por zona/fecha, verificación de identidad (aunque sea manual al inicio).

**Fase 2 — Reservas y pagos**
Flujo de solicitud/aceptación, integración Mercado Pago con retención, chat ligado a reserva.

**Fase 3 — Confianza y reputación**
Reseñas bidireccionales, badges de verificación, mecanismo básico de disputa/soporte.

**Fase 4 — Lanzamiento AMBA**
Landing optimizada para SEO/marketing, tracking de eventos, plan de adquisición inicial.

## 6. Próximos pasos técnicos

1. Confirmar stack (o ajustar si preferís otra opción).
2. Crear el repo y la estructura base.
3. Definir el esquema SQL completo (migraciones) a partir del modelo de datos de este documento.
4. Wireframes de las pantallas core antes de codear UI final.
