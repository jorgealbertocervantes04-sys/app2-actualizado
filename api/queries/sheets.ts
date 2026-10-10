// ─────────────────────────────────────────────────────────────
// Google Sheets como base de datos — SOLO SERVIDOR.
// La app habla con un Google Apps Script (Web App) que el dueño
// despliega sobre su propia hoja. Ver google-sheets.gs e
// INSTRUCCIONES.md.
// ─────────────────────────────────────────────────────────────
import { TRPCError } from "@trpc/server";

const SHEETS_URL = () => process.env.GOOGLE_SHEETS_URL ?? "";
const SHEETS_TOKEN = () => process.env.GOOGLE_SHEETS_TOKEN ?? "";

export function sheetsConfigured(): boolean {
  return Boolean(SHEETS_URL());
}

function assertConfigured() {
  if (!SHEETS_URL()) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Google Sheets no está configurado. Agrega GOOGLE_SHEETS_URL al archivo .env siguiendo INSTRUCCIONES.md.",
    });
  }
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  assertConfigured();
  let res: Response;
  try {
    res = await fetch(SHEETS_URL(), {
      method: "POST",
      // text/plain evita el preflight CORS contra Apps Script
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ ...body, token: SHEETS_TOKEN() }),
      redirect: "follow",
    });
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        "No se pudo conectar con Google Sheets. Revisa GOOGLE_SHEETS_URL y que el script esté desplegado con acceso «Cualquier persona».",
    });
  }
  let data: { ok?: boolean; data?: T; error?: string };
  try {
    data = (await res.json()) as { ok?: boolean; data?: T; error?: string };
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        "Google Sheets respondió algo inesperado. Verifica que la URL sea la del Web App (termina en /exec).",
    });
  }
  if (!data.ok) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Google Sheets: ${data.error ?? "error desconocido"}`,
    });
  }
  return data.data as T;
}

export type Row = Record<string, string | number | null>;

export async function readSheet(sheet: string): Promise<Row[]> {
  return call<Row[]>({ action: "read", sheet });
}

export async function appendRow(sheet: string, row: Row): Promise<Row> {
  return call<Row>({ action: "append", sheet, row });
}

export async function updateRow(
  sheet: string,
  key: string,
  value: string | number,
  patch: Row
): Promise<Row> {
  return call<Row>({ action: "update", sheet, key, value, patch });
}
