import { Footer } from "@/components/landing/Footer";
import { Navbar, type NavbarSesion } from "@/components/landing/Navbar";
import { getAvatarUrl } from "@/lib/auth/avatar";
import { getDisplayName } from "@/lib/auth/display-name";
import { createClient } from "@/lib/supabase/server";

export default async function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Antes el Navbar de las páginas públicas (landing, ficha de cuidador,
  // etc.) nunca miraba si había sesión activa, así que un usuario logueado
  // veía siempre "Iniciar sesión"/"Crear cuenta" hasta volver a una página
  // del dashboard. Se resuelve acá (server) y se le pasa al Navbar.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let sesion: NavbarSesion | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("roles")
      .eq("id", user.id)
      .maybeSingle();
    const esCuidador = profile?.roles?.includes("cuidador") ?? false;

    let fotoUrl = getAvatarUrl(user);
    if (esCuidador) {
      // Misma prioridad que en cuidador/layout.tsx: la foto que el
      // cuidador sube a mano pisa el avatar de Google.
      const { data: caregiverProfile } = await supabase
        .from("caregiver_profiles")
        .select("foto")
        .eq("user_id", user.id)
        .maybeSingle();
      fotoUrl = caregiverProfile?.foto || fotoUrl;
    }

    sesion = {
      name: getDisplayName(user),
      email: user.email ?? "",
      fotoUrl,
      homeHref: esCuidador ? "/cuidador" : "/dashboard",
    };
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar sesion={sesion} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
