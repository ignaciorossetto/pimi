import { HeartIcon, PawIcon, ShieldCheckIcon } from "@/components/icons";

const pillars = [
  {
    icon: ShieldCheckIcon,
    title: "Confianza verificable",
    description:
      "Identidad validada y reseñas bidireccionales, no promesas en la letra chica.",
  },
  {
    icon: HeartIcon,
    title: "Hecho para mascotas argentinas",
    description:
      "Empezamos en Córdoba Capital, entendiendo cómo se vive el cuidado de mascotas acá.",
  },
  {
    icon: PawIcon,
    title: "Simple de principio a fin",
    description:
      "Buscar, reservar y pagar en minutos, sin cadenas de WhatsApp con desconocidos.",
  },
];

export function AboutUs() {
  return (
    <section id="nosotros" className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Nosotros
          </h2>
          <p className="mt-3 text-foreground/70">
            Pimi nace de un problema muy simple: no había una forma fácil ni
            confiable de dejar a nuestra mascota cuando viajábamos. Lo
            construimos para que cuidar de tu mascota, o convertirte en
            cuidador, sea tan simple como merece ser.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {pillars.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-foreground/10 p-6 text-center"
            >
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-foreground/65">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
