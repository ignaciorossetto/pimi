import { HeartIcon, ShieldCheckIcon, StarIcon } from "@/components/icons";
import { PetIllustration } from "./PetIllustration";

const badges = [
  { icon: ShieldCheckIcon, label: "Identidad verificada" },
  { icon: HeartIcon, label: "Cuidadores que aman a los animales" },
  { icon: StarIcon, label: "Reseñas reales" },
];

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-14 md:grid-cols-2 md:pt-20">
      <div className="flex flex-col gap-6 text-center md:text-left">
        <span className="mx-auto rounded-full bg-brand/10 px-4 py-1 text-sm font-medium text-brand md:mx-0">
          AMBA · Fase de validación
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          Tu mascota, en buenas manos, mientras vos no estás.
        </h1>
        <p className="max-w-xl text-lg text-foreground/70 md:text-left">
          Pimi conecta dueños de mascotas con cuidadores verificados. Reservá
          en minutos, con pago protegido y reseñas reales.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
          <a
            href="/registro"
            className="rounded-lg bg-brand px-6 py-3 font-semibold text-white transition hover:bg-brand-dark"
          >
            Busco cuidador para mi mascota
          </a>
          <a
            href="/para-cuidadores"
            className="rounded-lg border border-foreground/20 px-6 py-3 font-semibold transition hover:bg-foreground/5"
          >
            Quiero ser cuidador
          </a>
        </div>

        <ul className="mt-2 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center md:justify-start">
          {badges.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-center justify-center gap-2 text-sm text-foreground/60 sm:justify-start"
            >
              <Icon className="h-4 w-4 shrink-0 text-accent" />
              {label}
            </li>
          ))}
        </ul>
      </div>

      <PetIllustration className="mx-auto w-full max-w-md" />
    </section>
  );
}
