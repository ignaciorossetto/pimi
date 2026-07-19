// Tipos compartidos entre apps, reflejan el esquema de supabase/migrations.
// Mantener sincronizado a mano en el MVP; evaluar generación automática
// (supabase gen types) más adelante.

export type UserRole = "dueño" | "cuidador";

export type VerificationStatus = "pendiente" | "aprobado" | "rechazado";

export interface Pet {
  id: string;
  ownerId: string;
  nombre: string;
  especie: "perro" | "gato" | "otro";
  raza?: string;
  tamano?: "chico" | "mediano" | "grande";
  edad?: number;
  temperamento?: string;
  necesidadesMedicas?: string;
  fotos: string[];
}

export interface CaregiverProfile {
  userId: string;
  zona: string;
  bio: string;
  tarifaBase: number;
  tiposDeServicio: Array<"hospedaje" | "visita_a_domicilio" | "paseo">;
  radioCoberturaKm: number;
  verificado: boolean;
}

export type BookingStatus =
  | "solicitado"
  | "aceptado"
  | "en_curso"
  | "completado"
  | "cancelado"
  | "disputado";

export interface Booking {
  id: string;
  ownerId: string;
  caregiverId: string;
  petId: string;
  fechaInicio: string;
  fechaFin: string;
  estado: BookingStatus;
  monto: number;
}
