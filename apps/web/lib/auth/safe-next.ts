/**
 * Valida un parámetro `next` (a dónde volver después de loguearse) para
 * que solo pueda ser una ruta relativa dentro de Pimi — nunca una URL
 * externa (evita usar `next` como open redirect). Se usa tanto en el
 * login con contraseña como en el callback de OAuth (Google).
 */
export function safeNext(next: string | null | undefined): string | null {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return null;
}
