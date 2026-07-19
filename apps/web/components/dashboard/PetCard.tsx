type Pet = {
  id: string;
  nombre: string;
  fotos: string[] | null;
};

const SIZES = {
  sm: {
    card: "w-32",
    text: "text-sm py-2",
    emoji: "text-3xl",
  },
  lg: {
    card: "w-44",
    text: "text-base font-semibold py-3",
    emoji: "text-5xl",
  },
} as const;

export function PetCard({
  pet,
  size = "sm",
}: {
  pet: Pet;
  size?: keyof typeof SIZES;
}) {
  const photo = pet.fotos?.[0];
  const s = SIZES[size];

  return (
    <a
      href={`/mascotas/${pet.id}`}
      className={`group ${s.card} shrink-0 overflow-hidden rounded-2xl border border-foreground/10 bg-background shadow-sm transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg`}
    >
      <div className="aspect-square w-full overflow-hidden bg-foreground/5">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={pet.nombre}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center ${s.emoji}`}
          >
            🐾
          </div>
        )}
      </div>
      <p className={`truncate px-3 text-center ${s.text}`}>{pet.nombre}</p>
    </a>
  );
}
