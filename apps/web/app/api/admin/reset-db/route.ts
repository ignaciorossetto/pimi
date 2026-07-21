import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Vacía todos los datos de prueba (usuarios, mascotas, reservas, chats,
 * pagos, reviews) — SOLO para desarrollo, mientras probamos la app antes
 * de lanzar. Doble bloqueo:
 *
 *   1) NODE_ENV === "production" => 403 siempre, sin excepción. En
 *      Vercel esto se setea solo en el deploy de producción, así que
 *      aunque el botón quede en el código después de lanzar, esta ruta
 *      no puede ejecutarse ahí.
 *   2) El usuario que llama tiene que ser admin (mismo chequeo que el
 *      resto de las rutas /api/admin/*).
 *
 * Conserva las cuentas admin (app_metadata.role === "admin") para no
 * quedarnos afuera del panel — todo lo demás se borra.
 */
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Esta acción no está disponible en producción." },
      { status: 403 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = (user?.app_metadata as { role?: string } | null)?.role;
  if (!user || role !== "admin") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const admin = createAdminClient();

  // 1) Vaciar todo lo que cuelga de reservas/mascotas/etc (ver migración
  // 0026). Se hace ANTES de borrar los usuarios porque bookings/reviews/
  // messages no tienen "on delete cascade" desde profiles — si
  // borráramos los usuarios primero, esas filas bloquearían el borrado
  // por violación de foreign key.
  const { error: truncateError } = await admin.rpc("admin_truncate_test_data");
  if (truncateError) {
    console.error("[Pimi] Error vaciando datos de prueba:", truncateError);
    return NextResponse.json(
      { error: "No pudimos vaciar los datos." },
      { status: 500 },
    );
  }

  // 2) Borrar todos los usuarios de auth excepto los admin. Se usa la
  // Admin API (no SQL directo sobre auth.users) para que Supabase limpie
  // también sus tablas internas (sesiones, identidades, etc). Cascada a
  // public.profiles vía "on delete cascade".
  let borrados = 0;
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error: listError } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (listError) {
      console.error("[Pimi] Error listando usuarios:", listError);
      return NextResponse.json(
        { error: "Vaciamos los datos, pero no pudimos borrar los usuarios." },
        { status: 500 },
      );
    }

    const usuarios = data.users;
    if (usuarios.length === 0) break;

    for (const u of usuarios) {
      const esAdmin =
        (u.app_metadata as { role?: string } | null)?.role === "admin";
      if (esAdmin) continue;

      const { error: deleteError } = await admin.auth.admin.deleteUser(u.id);
      if (deleteError) {
        console.error(`[Pimi] Error borrando usuario ${u.id}:`, deleteError);
        continue;
      }
      borrados += 1;
    }

    if (usuarios.length < perPage) break;
    page += 1;
  }

  return NextResponse.json({ ok: true, usuariosBorrados: borrados });
}
