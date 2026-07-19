# Pimi — Documento de Producto (MVP)

Versión 1 — 15 de julio de 2026

## 1. Problema

Cuando alguien viaja, dejar a su mascota es una fuente de ansiedad y logística: guarderías caras e impersonales, o pedirle el favor a un vecino/familiar sin garantías. Del lado del cuidador, hay gente dispuesta a cuidar mascotas (y a veces ganar dinero haciéndolo) pero sin un canal confiable para ofrecerse y sin herramientas para generar confianza rápido.

El problema no es solo de producto: **ya existen soluciones** (Mascoters en Argentina, PetBacker y TrustedHousesitters a nivel global, Rover/Wag en EE. UU.). El problema real es de categoría: ninguna logró instalarse en la cabeza del usuario argentino como "la app para esto". Mascoters, por ejemplo, lleva desde 2022 en el mercado con ~8.000 usuarios registrados y buena reputación puntual, pero baja notoriedad de marca fuera de círculos que ya la conocen.

Esto abre una oportunidad: no ganar por features, sino por **posicionamiento, confianza y ejecución de marketing** — construyendo un producto igual de sólido pero con una estrategia de adquisición y de marca que los competidores no hicieron bien.

## 2. Propuesta de valor

Pimi conecta dueños de mascotas con cuidadores verificados de forma simple, segura y con confianza construida en datos (reputación, verificación de identidad, historial), no en promesas.

Frase de posicionamiento (borrador): **"Tu mascota, en buenas manos, mientras vos no estás."**

Pilares:
1. **Confianza verificable**: identidad validada, reseñas bidireccionales, garantía ante problemas.
2. **Simplicidad**: reservar un cuidador debería tomar minutos, no mensajes de WhatsApp con desconocidos.
3. **Datos que mejoran el match**: desde el día 1 registramos señales (tipo de mascota, comportamiento, ubicación, preferencias, historial de reservas) para mejorar recomendaciones y detectar riesgo — esto es un activo que los competidores actuales no explotan bien.

## 3. Usuarios objetivo

### Dueños de mascotas
- Viven en CABA / AMBA (fase 1).
- Tienen perro y/o gato.
- Viajan por trabajo o vacaciones y no quieren usar guarderías tradicionales.
- Sensibles a la confianza: quieren ver perfil, reseñas, fotos, y idealmente verificación de identidad del cuidador.

### Cuidadores
- Personas que quieren un ingreso extra o aman los animales (estudiantes, jubilados, amantes de mascotas sin mascota propia, dueños de mascotas que se ofrecen a cambio).
- Necesitan un flujo simple para publicar disponibilidad, fijar tarifas y recibir pagos sin fricción.

## 4. Alcance del MVP

### Dentro del alcance (v1)
- Registro y perfil de dueño y de cuidador (puede ser la misma persona con ambos roles).
- Verificación de identidad básica (DNI + selfie, o al menos email/teléfono verificado en v1, con roadmap a verificación de identidad completa).
- Publicación de mascota (especie, raza, tamaño, edad, temperamento, necesidades médicas).
- Búsqueda de cuidadores por zona y fechas.
- Perfil de cuidador: fotos, zona, tarifa, tipo de servicio (hospedaje en su casa, visitas a domicilio, paseos), disponibilidad.
- Solicitud de reserva y confirmación (chat mínimo para coordinar detalles).
- Pago dentro de la plataforma (retenido hasta confirmar el servicio — modelo de garantía tipo escrow).
- Sistema de reseñas bidireccional (dueño califica cuidador y viceversa).
- Notificaciones básicas (email / push).

### Fuera de alcance (v1, evaluar después)
- Seguro veterinario propio o alianzas con seguros (v2) — ver nota en sección 8.
- Chat con IA / matching automático avanzado (v2, una vez haya datos).
- Multi-ciudad fuera de AMBA.
- App nativa (arrancamos con web app responsive; evaluamos apps nativas cuando haya tracción).
- Servicios adicionales (peluquería, veterinaria a domicilio, paseos recurrentes tipo suscripción).

## 5. Flujos clave

1. **Onboarding dueño**: registro → verificación básica → cargar mascota(s) → buscar cuidador.
2. **Onboarding cuidador**: registro → verificación de identidad → completar perfil (zona, tarifas, tipo de servicio, disponibilidad) → esperar aprobación/validación.
3. **Búsqueda y reserva**: dueño busca por fecha/zona → ve perfiles y disponibilidad → envía solicitud → cuidador acepta/rechaza → pago se retiene → servicio se realiza → ambas partes confirman → pago se libera → reseña mutua.
4. **Resolución de problemas**: canal de soporte/disputa si algo sale mal durante el servicio (mecanismo de garantía).

## 6. Modelo de negocio

Comisión sobre transacción, como el resto del mercado. Referencia competitiva:

| Plataforma | Comisión | Notas |
|---|---|---|
| Mascoters (AR) | 25% | Tarifa mínima ~$1.000/día fijada por cuidador |
| Rover (EE. UU.) | ~20% | Foco en hospedaje/estadías |
| Wag (EE. UU.) | ~40% | Foco en paseos on-demand |
| PawShake | ~19% | Europa/Canadá, tarifas propias del cuidador |
| PetBacker | Variable | Presencia internacional, incl. Argentina |

### 6.1 Sistema de tiers (implementado)

Para incentivar buen servicio sin depender de un partner externo (a
diferencia de la cobertura médica, ver sección 8.1), la comisión baja
automáticamente según la reputación del cuidador:

| Tier | Requisito | Comisión |
|---|---|---|
| Nuevo | — | 20.0% |
| Bronce | ≥ 5 reseñas, promedio ≥ 4.0 | 19.5% |
| Plata | ≥ 20 reseñas, promedio ≥ 4.3 | 19.0% |
| Oro | ≥ 50 reseñas, promedio ≥ 4.5 | 18.0% |

Se recalcula automáticamente con cada reseña nueva (trigger en base de
datos, sin proceso manual). El cuidador ve su nivel actual y cuánto le
falta para el próximo en su panel.

**Backlog explícitamente no implementado todavía**: la idea de sumar un
bono en pesos cuando una estadía dura más de 15 días y el cuidador mandó
todas las fotos obligatorias del check-in. Se dejó afuera de esta primera
versión porque cambia el cálculo del monto real que se cobra y se paga
(no solo el % de comisión), y eso conviene validarlo con el tier básico
funcionando primero antes de sumarle otra capa de lógica de pago.

Propuesta inicial para Pimi: **comisión competitiva (18–22%)** para diferenciarnos de Mascoters en el argumento de "el cuidador se lleva más", combinado con mejor experiencia y marketing. Definir número exacto cuando tengamos estructura de costos (pasarela de pago, soporte, seguros).

## 7. Diferenciación de marketing (por qué esta vez sí funciona)

El research confirma que la categoría existe y tiene demanda, pero ningún jugador argentino logró notoriedad de marca fuerte. Líneas de trabajo:
- **Marca memorable y consistente** desde el día 1 (naming, identidad visual, tono), no solo funcionalidad.
- **Contenido y comunidad** (Instagram/TikTok con mascotas reales, casos de uso, testimonios) — la categoría es muy visual y emocional, subexplotada por Mascoters/PetBacker en Argentina.
- **Confianza como mensaje central**, no como letra chica: verificación de identidad y garantías visibles en cada perfil, no solo en términos y condiciones.
- **Loop de referidos**: quien usa Pimi y tiene buena experiencia (dueño o cuidador) trae a alguien más — bajo costo de adquisición.
- **Data desde el día 1**: cada interacción (búsqueda, reserva, cancelación, reseña) se registra para poder optimizar producto y marketing con evidencia, no intuición, y para tener un activo de datos valioso a medida que crece la plataforma.

## 8. Seguridad y confianza (requisito no negociable)

Dado que se maneja información sensible (identidad, ubicación del hogar, pagos, acceso físico a la casa/mascota), la seguridad es parte del producto, no un extra:
- Verificación de identidad de cuidadores antes de habilitarlos a recibir reservas.
- Encriptación de datos sensibles en tránsito y en reposo.
- Pagos vía proveedor certificado (Mercado Pago / Stripe), nunca manejo directo de tarjetas.
- Control de acceso y auditoría sobre quién ve qué dato (RLS a nivel de base de datos).
- Política de privacidad clara y minimización de datos expuestos entre dueño y cuidador (ej. no compartir dirección exacta hasta confirmar reserva).

### 8.1 Nota: cobertura médica/veterinaria (decisión de negocio pendiente)

Surgió la idea de que Pimi ofrezca algún tipo de cobertura médica/veterinaria
para la mascota durante el período de cuidado (ej. "si algo le pasa a tu
mascota mientras la cuida un cuidador de Pimi, está cubierta"). **Esto todavía
no está implementado ni prometido en ningún lugar del producto**, y no debería
comunicarse como beneficio hasta resolver:

- Si se arma como alianza con una aseguradora/veterinaria real (modelo
  Mascoters-style) o como fondo propio de garantía.
- Costos, exclusiones y proceso de reclamo — una cobertura mal definida es un
  riesgo legal y de confianza mayor que no tener cobertura.
- Si aplica desde el día 1 o se lanza en v2 una vez haya volumen de reservas
  para negociar con una aseguradora.

Hasta que esto se defina, el producto no debe mostrar textos como "mascota
asegurada" o "cobertura incluida" en ningún perfil, landing o comunicación de
marketing.

### 8.2 Detección de intentos de salir de la plataforma (implementado, v1 básico)

Para desincentivar que dueño y cuidador coordinen pago o contacto fuera de
Pimi (lo cual elimina la comisión y las garantías de la plataforma), el chat
de cada reserva tiene una detección **heurística por patrones** (no un
modelo de IA real todavía):

- Un trigger en la base de datos revisa cada mensaje enviado buscando
  emails, números de teléfono, y palabras clave (WhatsApp, Instagram,
  Mercado Pago, transferencia, efectivo, "fuera de la app", etc.) y guarda
  un evento marcado para revisión del equipo (no bloquea el envío).
- El campo de chat también muestra una advertencia al usuario antes de
  enviar un mensaje que matchea el mismo patrón, dándole la opción de
  editarlo o enviarlo igual.
- El panel de admin lista los mensajes marcados para que el equipo pueda
  revisar manualmente y actuar (advertencia, suspensión, etc.).

Esto es un placeholder razonable para v1. El upgrade natural a futuro es
reemplazar la heurística por un modelo de lenguaje real que entienda
intención y contexto, no solo patrones de texto — está aislado en un solo
punto del código para que ese reemplazo sea simple cuando se decida invertir
en eso.

## 9. Métricas de éxito iniciales (fase de validación)

- Número de cuidadores verificados activos en AMBA.
- Número de reservas completadas por semana.
- Tasa de conversión búsqueda → reserva.
- NPS / calificación promedio post-servicio.
- Tasa de recompra (dueños que vuelven a reservar).

## 10. Próximos pasos

1. Validar este documento (ajustar zona geográfica exacta, nombre/marca definitivo, comisión).
2. Pasar a arquitectura técnica (documento separado).
3. Definir wireframes de las pantallas core del MVP.
4. Armar plan de lanzamiento y adquisición inicial (comunidad, referidos, contenido).
