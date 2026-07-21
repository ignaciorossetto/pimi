import {
  CalendarCheckIcon,
  ClockIcon,
  CoinIcon,
  SearchIcon,
  ShieldCheckIcon,
} from "@/components/icons";
import { CaregiverIllustration } from "@/components/landing/CaregiverIllustration";

const valueProps = [
  {
    icon: ClockIcon,
    title: "Flexibilidad total",
    description:
      "Elegís cuándo estás disponible y qué servicios ofrecés: hospedaje, visitas o paseos.",
  },
  {
    icon: CoinIcon,
    title: "Vos ponés el precio",
    description:
      "Fijás tu propia tarifa por día. Nada de precios impuestos por la plataforma.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Pago protegido",
    description:
      "El dueño paga por adelantado y el monto se libera a tu cuenta cuando el servicio termina.",
  },
];

const steps = [
  {
    icon: SearchIcon,
    title: "Creá tu perfil",
    description:
      "Zona, tarifa, tipo de servicio y una bio corta contando por qué te encantan los animales.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Verificá tu identidad",
    description:
      "Un paso simple que le da confianza a los dueños para elegirte a vos.",
  },
  {
    icon: CalendarCheckIcon,
    title: "Recibí solicitudes",
    description:
      "Los dueños de tu zona te encuentran y te piden fechas. Vos decidís qué aceptar.",
  },
  {
    icon: CoinIcon,
    title: "Cuidá y cobrá",
    description:
      "Terminás el servicio, la mascota vuelve feliz, y el pago se libera automáticamente.",
  },
];

const faqs = [
  {
    question: "¿Cuánto cobra Pimi de comisión?",
    answer:
      "Una comisión competitiva sobre cada reserva completada, siempre visible antes de aceptar — nunca en la letra chica.",
  },
  {
    question: "¿Cuándo recibo el pago?",
    answer:
      "El dueño paga al reservar y el monto queda retenido en Pimi. Se libera a tu cuenta apenas se confirma que el servicio terminó bien.",
  },
  {
    question: "¿Necesito experiencia previa?",
    answer:
      "No es obligatoria. Sí pedimos buena predisposición, amor por los animales y pasar la verificación de identidad antes de recibir reservas.",
  },
  {
    question: "¿Qué pasa si algo sale mal durante el cuidado?",
    answer:
      "Tenés soporte de Pimi y un mecanismo de garantía pensado para resolver imprevistos durante el servicio.",
  },
];

export default function ParaCuidadoresPage() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-14 md:grid-cols-2 md:pt-20">
        <div className="flex flex-col gap-6 text-center md:text-left">
          <span className="mx-auto rounded-full bg-accent/10 px-4 py-1 text-sm font-medium text-accent md:mx-0">
            Para cuidadores · Córdoba Capital
          </span>
          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Ganá dinero cuidando mascotas, a tu manera.
          </h1>
          <p className="max-w-xl text-lg text-foreground/70 md:text-left">
            Sumate a Pimi como cuidador: vos elegís tus horarios, tu tarifa y
            qué tipo de cuidado ofrecés. Nosotros nos encargamos de la
            confianza y el pago.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
            <a
              href="/registro?rol=cuidador"
              className="rounded-lg bg-accent px-6 py-3 font-semibold text-white transition hover:opacity-90"
            >
              Quiero ser cuidador
            </a>
            <a
              href="#como-funciona-cuidador"
              className="rounded-lg border border-foreground/20 px-6 py-3 font-semibold transition hover:bg-foreground/5"
            >
              Ver cómo funciona
            </a>
          </div>
        </div>

        <CaregiverIllustration className="mx-auto w-full max-w-md" />
      </section>

      <section className="bg-surface py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Por qué cuidar con Pimi
            </h2>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {valueProps.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl bg-background p-6 shadow-sm ring-1 ring-foreground/5"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-foreground/65">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona-cuidador" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Cómo funciona
            </h2>
            <p className="mt-3 text-foreground/70">
              De crear tu perfil a cobrar tu primer cuidado.
            </p>
          </div>

          <ol className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ icon: Icon, title, description }, index) => (
              <li
                key={title}
                className="relative flex flex-col gap-3 rounded-2xl border border-foreground/10 p-6"
              >
                <span className="absolute right-5 top-5 text-sm font-bold text-foreground/15">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-foreground/65">{description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-surface py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Preguntas frecuentes
          </h2>

          <div className="mt-10 flex flex-col gap-3">
            {faqs.map(({ question, answer }) => (
              <details
                key={question}
                className="group rounded-xl bg-background p-5 ring-1 ring-foreground/10 open:ring-accent/30"
              >
                <summary className="cursor-pointer list-none font-semibold marker:content-none">
                  {question}
                </summary>
                <p className="mt-2 text-sm text-foreground/65">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          ¿Listo para empezar a cuidar?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-foreground/70">
          Creá tu perfil de cuidador en un par de minutos.
        </p>
        <a
          href="/registro?rol=cuidador"
          className="mt-6 inline-block rounded-lg bg-accent px-6 py-3 font-semibold text-white transition hover:opacity-90"
        >
          Quiero ser cuidador
        </a>
      </section>
    </>
  );
}
