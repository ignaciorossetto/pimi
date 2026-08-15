import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidad — Pimi",
  description:
    "Cómo Pimi recolecta, usa y protege tus datos personales, conforme a la Ley 25.326 de Protección de Datos Personales de Argentina.",
};

const ULTIMA_ACTUALIZACION = "15 de agosto de 2026";

function Seccion({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">{titulo}</h2>
      <div className="mt-2 flex flex-col gap-3 text-sm leading-relaxed text-foreground/75">
        {children}
      </div>
    </section>
  );
}

export default function PrivacidadPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold">Política de Privacidad</h1>
      <p className="mt-2 text-sm text-foreground/50">
        Última actualización: {ULTIMA_ACTUALIZACION}
      </p>

      <Seccion titulo="1. Responsable del tratamiento">
        <p>
          Pimi (Córdoba, Argentina) es responsable del tratamiento de los
          datos personales que recolecta a través de la plataforma, en los
          términos de la Ley 25.326 de Protección de Datos Personales y su
          normativa complementaria.
        </p>
      </Seccion>

      <Seccion titulo="2. Qué datos recolectamos">
        <p>
          <strong>De todos los usuarios:</strong> nombre, email, teléfono,
          contraseña (almacenada en forma cifrada) o identificación de tu
          cuenta de Google si elegís ese método de acceso, y los datos de
          uso de la plataforma (búsquedas, reservas, mensajes del chat de
          cada reserva, reseñas).
        </p>
        <p>
          <strong>De los Dueños:</strong> datos de sus mascotas (especie,
          raza, tamaño, edad, temperamento, necesidades médicas, fotos).
        </p>
        <p>
          <strong>De los Cuidadores:</strong> además, los datos del proceso
          de verificación de identidad: número y fotos del DNI, selfie,
          comprobante y datos de domicilio (incluida su geolocalización), y
          los datos bancarios (CBU/alias y titular) necesarios para
          pagarles.
        </p>
        <p>
          <strong>Durante un cuidado:</strong> las fotos y la ubicación de
          los registros de llegada, novedades diarias y salida que carga el
          Cuidador.
        </p>
      </Seccion>

      <Seccion titulo="3. Para qué los usamos (finalidades)">
        <p>
          Usamos tus datos para: crear y administrar tu cuenta; conectar
          Dueños con Cuidadores y mostrar perfiles públicos de Cuidadores;
          verificar la identidad de los Cuidadores como medida de seguridad;
          procesar reservas, pagos, retenciones, reembolsos y
          liquidaciones; enviarte notificaciones operativas por email
          (solicitudes, confirmaciones, recordatorios, pagos); atender
          reportes y disputas; prevenir fraude y usos indebidos; y mejorar
          el servicio a partir de datos de uso agregados.
        </p>
        <p>
          La base legal del tratamiento es tu consentimiento (que prestás
          al aceptar esta política) y la ejecución de la relación
          contractual descripta en los{" "}
          <a href="/terminos" className="text-brand hover:underline">
            Términos y Condiciones
          </a>
          .
        </p>
      </Seccion>

      <Seccion titulo="4. Tu ubicación exacta nunca es pública">
        <p>
          La dirección exacta del domicilio de un Cuidador nunca se muestra
          públicamente: en las búsquedas y perfiles solo se ve una{" "}
          <strong>zona aproximada</strong> (ubicación difuminada). La
          dirección exacta solo se comparte con el Dueño una vez confirmada
          una reserva, y es visible para el equipo de Pimi a fines
          operativos.
        </p>
      </Seccion>

      <Seccion titulo="5. Con quién compartimos datos">
        <p>
          No vendemos tus datos. Los compartimos únicamente con los
          proveedores necesarios para operar: <strong>Mercado Pago</strong>{" "}
          (procesamiento de pagos), <strong>Google</strong> (si iniciás
          sesión con Google), <strong>Resend</strong> (envío de emails),
          y nuestra infraestructura de hosting y base de datos
          (<strong>Vercel</strong> y <strong>Supabase</strong>). Algunos de
          estos proveedores procesan datos fuera de Argentina; en esos
          casos la transferencia se realiza hacia servicios con niveles
          adecuados de protección y bajo sus respectivos compromisos de
          confidencialidad.
        </p>
        <p>
          También podremos compartir datos si una autoridad judicial o
          administrativa competente lo requiere legalmente.
        </p>
      </Seccion>

      <Seccion titulo="6. Cómo protegemos tus datos">
        <p>
          Aplicamos medidas de seguridad técnicas y organizativas: acceso a
          los datos restringido por reglas a nivel de base de datos, los
          documentos sensibles (DNI, selfie, comprobantes) se almacenan en
          repositorios privados accesibles solo mediante enlaces firmados
          temporales, y las contraseñas se guardan cifradas. Ningún sistema
          es infalible, pero diseñamos la plataforma con la seguridad como
          criterio central.
        </p>
      </Seccion>

      <Seccion titulo="7. Cuánto tiempo conservamos los datos">
        <p>
          Conservamos tus datos mientras tu cuenta esté activa y, luego de
          su baja, por el tiempo necesario para cumplir obligaciones
          legales, contables y de defensa ante eventuales reclamos. Los
          documentos de verificación de identidad se conservan mientras
          seas Cuidador activo.
        </p>
      </Seccion>

      <Seccion titulo="8. Tus derechos">
        <p>
          Como titular de los datos podés ejercer en cualquier momento tus
          derechos de <strong>acceso, rectificación, actualización y
          supresión</strong> (Ley 25.326, arts. 14 a 16), escribiéndonos
          desde la plataforma o al email de contacto del sitio. El derecho
          de acceso es gratuito a intervalos no inferiores a seis meses,
          salvo interés legítimo.
        </p>
        <p>
          La Agencia de Acceso a la Información Pública (AAIP), órgano de
          control de la Ley 25.326, tiene la atribución de atender
          denuncias y reclamos que se interpongan con relación al
          incumplimiento de las normas sobre protección de datos
          personales.
        </p>
      </Seccion>

      <Seccion titulo="9. Menores de edad">
        <p>
          La plataforma está destinada exclusivamente a mayores de 18 años.
          No recolectamos deliberadamente datos de menores.
        </p>
      </Seccion>

      <Seccion titulo="10. Cambios a esta política">
        <p>
          Si modificamos esta política, publicaremos la versión nueva en
          esta página con su fecha de actualización y, si el cambio es
          significativo, te lo comunicaremos por email o dentro de la
          plataforma.
        </p>
      </Seccion>
    </main>
  );
}
