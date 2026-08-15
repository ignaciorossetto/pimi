import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y Condiciones — Pimi",
  description:
    "Términos y Condiciones de uso de Pimi, la plataforma que conecta dueños de mascotas con cuidadores verificados en Córdoba.",
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

export default function TerminosPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold">Términos y Condiciones</h1>
      <p className="mt-2 text-sm text-foreground/50">
        Última actualización: {ULTIMA_ACTUALIZACION}
      </p>

      <Seccion titulo="1. Qué es Pimi y aceptación de estos términos">
        <p>
          Pimi (en adelante, “la Plataforma”) es una plataforma digital que
          conecta a personas que necesitan cuidado para sus mascotas (en
          adelante, “Dueños”) con personas que ofrecen servicios de cuidado
          de mascotas (en adelante, “Cuidadores”), operando inicialmente en
          Córdoba Capital, Argentina.
        </p>
        <p>
          Al crear una cuenta, marcar la casilla de aceptación o utilizar la
          Plataforma de cualquier forma, aceptás estos Términos y
          Condiciones y la{" "}
          <a href="/privacidad" className="text-brand hover:underline">
            Política de Privacidad
          </a>
          . Si no estás de acuerdo, no uses la Plataforma.
        </p>
      </Seccion>

      <Seccion titulo="2. Naturaleza del servicio: Pimi es un intermediario">
        <p>
          Pimi actúa exclusivamente como <strong>intermediario</strong>{" "}
          entre Dueños y Cuidadores: pone a disposición la infraestructura
          tecnológica para que se encuentren, coordinen, contraten y paguen
          el servicio de cuidado. El servicio de cuidado en sí es prestado
          por el Cuidador de manera independiente:{" "}
          <strong>
            el contrato de cuidado se celebra directamente entre el Dueño y
            el Cuidador
          </strong>
          . Los Cuidadores no son empleados, agentes ni representantes de
          Pimi, y no existe entre ellos y la Plataforma relación laboral ni
          societaria alguna.
        </p>
      </Seccion>

      <Seccion titulo="3. Cuentas y registro">
        <p>
          Para usar la Plataforma tenés que ser mayor de 18 años y
          registrarte con datos veraces, completos y actualizados. Sos
          responsable de la confidencialidad de tus credenciales y de toda
          actividad realizada desde tu cuenta. Una misma persona puede
          tener rol de Dueño y de Cuidador.
        </p>
        <p>
          Pimi puede suspender o dar de baja cuentas que incumplan estos
          términos, proporcionen información falsa o hagan un uso indebido
          de la Plataforma.
        </p>
      </Seccion>

      <Seccion titulo="4. Verificación de identidad de Cuidadores">
        <p>
          Para poder recibir reservas, los Cuidadores deben completar un
          proceso de verificación de identidad que incluye documento de
          identidad, una selfie y un comprobante de domicilio, revisados por
          el equipo de Pimi. La verificación es una medida de confianza y
          diligencia, pero <strong>no constituye una garantía absoluta</strong>{" "}
          sobre la conducta futura de ninguna persona.
        </p>
      </Seccion>

      <Seccion titulo="5. Reservas, precios y pagos">
        <p>
          Cada Cuidador fija su propia tarifa. Al confirmarse una reserva,
          el Dueño paga el monto total a través de la Plataforma (Mercado
          Pago). Pimi <strong>retiene el pago</strong> y lo libera al
          Cuidador recién <strong>48 horas después de finalizado el
          cuidado</strong>, como garantía para el Dueño (modelo de pago
          protegido). Por el servicio de intermediación, Pimi percibe una
          comisión que se descuenta de la parte del Cuidador, cuyo
          porcentaje puede variar según la reputación del Cuidador y se
          informa en su panel.
        </p>
        <p>
          El pago efectivo al Cuidador se realiza mediante transferencia a
          los datos bancarios que este cargue en su perfil, conforme al
          circuito de liquidaciones de la Plataforma.
        </p>
      </Seccion>

      <Seccion titulo="6. Cancelaciones">
        <p>
          Una solicitud de reserva no respondida por el Cuidador antes de la
          fecha de inicio se cancela automáticamente. Si un Dueño confirma
          una reserva con un Cuidador, las demás solicitudes pendientes para
          la misma mascota y fechas se cancelan automáticamente. Las
          cancelaciones de reservas ya pagadas se resuelven caso por caso a
          través del mecanismo de problemas y disputas de la sección 7.
        </p>
      </Seccion>

      <Seccion titulo="7. Problemas, disputas y reembolsos">
        <p>
          Si hubo un problema con el cuidado, el Dueño puede reportarlo
          desde la reserva <strong>mientras el pago esté retenido</strong>{" "}
          (hasta 48 horas después de finalizado el cuidado). El reporte
          congela la liberación del pago y el equipo de Pimi revisa el caso,
          pudiendo contactar a ambas partes. La revisión puede concluir en
          la liberación del pago al Cuidador o en el reembolso al Dueño. La
          decisión de Pimi en esta instancia no impide que las partes
          ejerzan las acciones legales que consideren.
        </p>
      </Seccion>

      <Seccion titulo="8. Obligaciones del Dueño">
        <p>
          El Dueño declara que la información sobre su mascota (especie,
          tamaño, edad, temperamento, necesidades médicas) es veraz y
          completa, que la mascota cuenta con las vacunas y condiciones
          sanitarias exigibles, y que no oculta antecedentes de conducta
          relevantes (agresividad, fugas, etc.). El Dueño es responsable,
          como dueño del animal, por los daños que este cause, en los
          términos del Código Civil y Comercial de la Nación.
        </p>
      </Seccion>

      <Seccion titulo="9. Obligaciones del Cuidador">
        <p>
          El Cuidador se compromete a: prestar el cuidado personalmente (no
          delegarlo), hacerlo con la diligencia de un buen cuidador,
          registrar la llegada, las novedades diarias y la salida con foto y
          ubicación desde la Plataforma, respetar las indicaciones del
          Dueño, e informar de inmediato cualquier incidente relevante
          (fuga, accidente, problema de salud). Mientras la mascota está
          bajo su guarda, el Cuidador asume los deberes propios de esa
          guarda.
        </p>
      </Seccion>

      <Seccion titulo="10. Prohibición de eludir la Plataforma">
        <p>
          Está prohibido usar la Plataforma para captar clientes y luego
          acordar el servicio o el pago por fuera de ella. Los pagos
          realizados fuera de la Plataforma{" "}
          <strong>
            no cuentan con la retención de garantía, el mecanismo de
            disputas ni ningún otro respaldo de Pimi
          </strong>
          . Pimi puede suspender las cuentas involucradas en maniobras de
          elusión.
        </p>
      </Seccion>

      <Seccion titulo="11. Reseñas">
        <p>
          Al finalizar un cuidado, Dueño y Cuidador pueden calificarse
          mutuamente. Las reseñas deben ser veraces y respetuosas. Se
          publican bajo un esquema de doble ciego (se revelan cuando ambas
          partes calificaron o tras un plazo). Pimi puede remover reseñas
          que contengan insultos, datos personales o contenido ilegal.
        </p>
      </Seccion>

      <Seccion titulo="12. Responsabilidad">
        <p>
          Pimi responde por el correcto funcionamiento de la Plataforma y
          del circuito de pagos descripto en la sección 5. En su carácter
          de intermediario, Pimi no es parte del contrato de cuidado y no
          garantiza el resultado del servicio prestado por el Cuidador.
          Nada de lo dispuesto en estos términos limita los derechos que
          asisten a los usuarios en su carácter de consumidores conforme a
          la Ley 24.240 de Defensa del Consumidor y normas concordantes.
        </p>
      </Seccion>

      <Seccion titulo="13. Propiedad intelectual">
        <p>
          La marca Pimi, el software, el diseño y los contenidos de la
          Plataforma son propiedad de Pimi o de sus licenciantes. El
          contenido que subís (fotos, textos, reseñas) sigue siendo tuyo,
          pero nos otorgás una licencia gratuita y no exclusiva para
          mostrarlo dentro de la Plataforma con el fin de prestar el
          servicio.
        </p>
      </Seccion>

      <Seccion titulo="14. Datos personales">
        <p>
          El tratamiento de tus datos personales se rige por nuestra{" "}
          <a href="/privacidad" className="text-brand hover:underline">
            Política de Privacidad
          </a>
          , que forma parte de estos términos.
        </p>
      </Seccion>

      <Seccion titulo="15. Modificaciones">
        <p>
          Pimi puede modificar estos términos. Los cambios se publican en
          esta página con su fecha de actualización y, si son
          significativos, se comunican por email o dentro de la Plataforma.
          El uso de la Plataforma después de publicados los cambios implica
          su aceptación.
        </p>
      </Seccion>

      <Seccion titulo="16. Ley aplicable y jurisdicción">
        <p>
          Estos términos se rigen por las leyes de la República Argentina.
          Toda controversia se someterá a los tribunales ordinarios de la
          ciudad de Córdoba, sin perjuicio del derecho de los usuarios
          consumidores de accionar ante los tribunales correspondientes a su
          domicilio conforme a la normativa de defensa del consumidor.
        </p>
      </Seccion>

      <Seccion titulo="17. Contacto">
        <p>
          Por consultas sobre estos términos podés escribirnos desde la
          Plataforma o al email de contacto publicado en el sitio.
        </p>
      </Seccion>
    </main>
  );
}
