export const ESTADO_LABEL: Record<string, string> = {
  solicitado: "Solicitada",
  aceptado: "Aceptada",
  en_curso: "En curso",
  completado: "Completada",
  cancelado: "Cancelada",
  disputado: "En disputa",
};

export const ESTADO_COLOR: Record<string, string> = {
  solicitado: "bg-amber-100 text-amber-700",
  aceptado: "bg-accent/10 text-accent",
  en_curso: "bg-brand/10 text-brand",
  completado: "bg-green-100 text-green-700",
  cancelado: "bg-foreground/10 text-foreground/60",
  disputado: "bg-red-100 text-red-700",
};
