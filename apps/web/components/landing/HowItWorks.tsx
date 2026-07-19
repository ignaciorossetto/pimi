import {
  CalendarCheckIcon,
  HomeHeartIcon,
  SearchIcon,
  StarIcon,
} from "@/components/icons";

const steps = [
  {
    icon: SearchIcon,
    title: "Buscá un cuidador",
    description:
      "Filtrá por zona y fechas y mirá perfiles verificados, con tarifa y reseñas a la vista.",
  },
  {
    icon: CalendarCheckIcon,
    title: "Reservá y coordiná",
    description:
      "Enviá la solicitud, coordiná los detalles de tu mascota por chat y pagá dentro de la plataforma.",
  },
  {
    icon: HomeHeartIcon,
    title: "Tu mascota, cuidada",
    description:
      "El pago queda protegido hasta que el servicio termina. Vos viajás tranquilo.",
  },
  {
    icon: StarIcon,
    title: "Calificá la experiencia",
    description:
      "Dejá tu reseña y ayudá a construir una comunidad de confianza entre dueños y cuidadores.",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="bg-surface py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            De la búsqueda a las vacaciones tranquilas
          </h2>
          <p className="mt-3 text-foreground/70">
            Así es el camino de un dueño en Pimi, de punta a punta.
          </p>
        </div>

        <ol className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, title, description }, index) => (
            <li
              key={title}
              className="relative flex flex-col gap-3 rounded-2xl bg-background p-6 shadow-sm ring-1 ring-foreground/5"
            >
              <span className="absolute right-5 top-5 text-sm font-bold text-foreground/15">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-foreground/65">{description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
