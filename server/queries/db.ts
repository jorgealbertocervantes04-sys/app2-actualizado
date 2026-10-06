// ─────────────────────────────────────────────────────────────
// Supabase (Postgres) — SOLO SERVIDOR.
// Usa la service role key: nunca se envía al navegador. Las tablas
// tienen RLS activado y sin políticas, así que solo este backend
// puede leerlas o escribirlas.
// ─────────────────────────────────────────────────────────────
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { TRPCError } from "@trpc/server";

let _client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Supabase no está configurado. Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.",
    });
  }
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

/** Desenvuelve una respuesta de supabase-js o lanza un error tRPC. */
export function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Base de datos: ${res.error.message}`,
    });
  }
  return res.data as T;
}
