import type { SupabaseClient } from "@supabase/supabase-js";

export type UnreadSummary = {
  count: number;
  latestBookingId: string | null;
};

const EPOCH = "1970-01-01T00:00:00.000Z";

/**
 * Cuenta mensajes de la otra parte que llegaron después del último
 * timestamp de lectura de este usuario en cada reserva (ver migración
 * 0014_message_reads.sql). Si nunca se leyó una reserva, cualquier
 * mensaje de la otra parte cuenta como no leído.
 */
export async function getUnreadSummary(
  supabase: SupabaseClient,
  userId: string,
  bookingIds: string[],
): Promise<UnreadSummary> {
  if (bookingIds.length === 0) {
    return { count: 0, latestBookingId: null };
  }

  const [{ data: reads }, { data: messages }] = await Promise.all([
    supabase
      .from("message_reads")
      .select("booking_id, last_read_at")
      .eq("user_id", userId)
      .in("booking_id", bookingIds),
    supabase
      .from("messages")
      .select("booking_id, created_at")
      .neq("autor_id", userId)
      .in("booking_id", bookingIds)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const readMap = new Map<string, string>(
    (reads ?? []).map((r: { booking_id: string; last_read_at: string }) => [
      r.booking_id,
      r.last_read_at,
    ]),
  );

  let count = 0;
  let latestBookingId: string | null = null;
  let latestAt = "";

  for (const m of (messages ?? []) as { booking_id: string; created_at: string }[]) {
    const lastRead = readMap.get(m.booking_id) ?? EPOCH;
    if (m.created_at > lastRead) {
      count++;
      if (m.created_at > latestAt) {
        latestAt = m.created_at;
        latestBookingId = m.booking_id;
      }
    }
  }

  return { count, latestBookingId };
}
