// ─────────────────────────────────────────────────────────────
// Lógica de datos — Supabase (Postgres) vía server/queries/db.ts.
// Tablas: sim_participantes, sim_sesiones, sim_respuestas.
// ─────────────────────────────────────────────────────────────
import { createHash, timingSafeEqual } from "node:crypto";
import {
  MODULES,
  VARIANTS,
  computeResult,
  getScenarioById,
  type AreaId,
  type EvaluationResult,
} from "../../contracts/course.js";
import { scoreActivity } from "../scoring.js";
import { db, must } from "./db.js";
import { TRPCError } from "@trpc/server";

export function assertAdmin(code: string) {
  const expected = process.env.ADMIN_CODE ?? "";
  const digest = (s: string) =>
    createHash("sha256").update(s.trim().toUpperCase()).digest();
  const ok =
    expected.length > 0 && timingSafeEqual(digest(code), digest(expected));
  if (!ok) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Clave incorrecta" });
  }
}

// ── Tipos (se mantienen igual para no afectar al frontend) ────

export interface Participant {
  id: number;
  name: string;
  employeeNo: string;
  base: string;
  createdAt: Date;
}

export interface Session {
  id: number;
  participantId: number;
  status: "in_progress" | "completed";
  totalPct: number | null;
  verdict: string | null;
  resultJson: string | null;
  variant: string;
  attempt: number;
  startedAt: Date;
  completedAt: Date | null;
}

export interface ResponseRow {
  id: number;
  sessionId: number;
  scenarioId: string;
  optionId: string;
  score: number;
  payload: string | null;
  aiFeedback: string | null;
  answeredAt: Date;
}

// ── Filas de Supabase → tipos de la app ───────────────────────

type DbRow = Record<string, unknown>;
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const num = (v: unknown) => Number(v ?? 0);
const date = (v: unknown) => (v ? new Date(str(v)) : null);
const json = (v: unknown) =>
  v === null || v === undefined ? null : JSON.stringify(v);

function toParticipant(r: DbRow): Participant {
  return {
    id: num(r.id),
    name: str(r.nombre),
    employeeNo: str(r.no_empleado),
    base: str(r.base),
    createdAt: date(r.created_at) ?? new Date(),
  };
}

function toSession(r: DbRow): Session {
  return {
    id: num(r.id),
    participantId: num(r.participante_id),
    status: r.estado === "completed" ? "completed" : "in_progress",
    totalPct: r.total_pct === null || r.total_pct === undefined ? null : num(r.total_pct),
    verdict: r.veredicto === null || r.veredicto === undefined ? null : str(r.veredicto),
    resultJson: json(r.resultado),
    variant: str(r.variante) || "A",
    attempt: r.intento ? num(r.intento) : 1,
    startedAt: date(r.iniciada_at) ?? new Date(),
    completedAt: date(r.completada_at),
  };
}

function toResponse(r: DbRow): ResponseRow {
  return {
    id: num(r.id),
    sessionId: num(r.sesion_id),
    scenarioId: str(r.escenario_id),
    optionId: str(r.opcion_id),
    score: num(r.puntaje),
    payload: json(r.payload),
    aiFeedback: r.ai_feedback === null || r.ai_feedback === undefined ? null : str(r.ai_feedback),
    answeredAt: date(r.respondida_at) ?? new Date(),
  };
}

// ── Participantes y sesiones ──────────────────────────────────

async function findOpenSession(participantId: number): Promise<Session | null> {
  const row = must(
    await db()
      .from("sim_sesiones")
      .select("*")
      .eq("participante_id", participantId)
      .eq("estado", "in_progress")
      .order("iniciada_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  );
  return row ? toSession(row) : null;
}

export async function startOrResume(input: {
  name: string;
  employeeNo: string;
  base: string;
}) {
  // Crea el participante o actualiza nombre/base si ya existe.
  const participant = toParticipant(
    must(
      await db()
        .from("sim_participantes")
        .upsert(
          { nombre: input.name, no_empleado: input.employeeNo, base: input.base },
          { onConflict: "no_empleado" }
        )
        .select()
        .single()
    )
  );

  // Reanudar sesión en progreso si existe
  let session = await findOpenSession(participant.id);
  let resumed = true;
  if (!session) {
    // Intento n = sesiones previas del participante + 1. La variante
    // rota por intento: quien re-simula nunca repite escenario.
    const { count, error: countError } = await db()
      .from("sim_sesiones")
      .select("id", { count: "exact", head: true })
      .eq("participante_id", participant.id);
    if (countError)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Base de datos: ${countError.message}`,
      });
    const attempt = (count ?? 0) + 1;
    const variant = VARIANTS[(attempt - 1) % VARIANTS.length];
    const ins = await db()
      .from("sim_sesiones")
      .insert({
        participante_id: participant.id,
        estado: "in_progress",
        variante: variant,
        intento: attempt,
      })
      .select()
      .single();
    if (ins.error?.code === "23505") {
      // Doble envío simultáneo: otra petición ya creó el intento.
      session = await findOpenSession(participant.id);
    } else {
      session = toSession(must(ins));
      resumed = false;
    }
    if (!session)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "No se pudo crear la sesión",
      });
  }
  return { participant, session, resumed };
}

export async function getSessionState(sessionId: number) {
  const sRow = must(
    await db().from("sim_sesiones").select("*").eq("id", sessionId).maybeSingle()
  );
  if (!sRow)
    throw new TRPCError({ code: "NOT_FOUND", message: "Sesión no encontrada" });
  const session = toSession(sRow);

  const pRow = must(
    await db()
      .from("sim_participantes")
      .select("*")
      .eq("id", session.participantId)
      .maybeSingle()
  );
  if (!pRow)
    throw new TRPCError({ code: "NOT_FOUND", message: "Participante no encontrado" });

  const answers = (
    must(
      await db()
        .from("sim_respuestas")
        .select("*")
        .eq("sesion_id", sessionId)
        .order("respondida_at", { ascending: true })
    ) ?? []
  ).map(toResponse);
  return { session, participant: toParticipant(pRow), answers };
}

// ── Actividades (la puntuación se calcula en servidor) ───────

export async function saveActivity(input: {
  sessionId: number;
  scenarioId: string;
  payload: Record<string, unknown>;
}) {
  const sRow = must(
    await db()
      .from("sim_sesiones")
      .select("*")
      .eq("id", input.sessionId)
      .maybeSingle()
  );
  if (!sRow)
    throw new TRPCError({ code: "NOT_FOUND", message: "Sesión no encontrada" });
  const session = toSession(sRow);
  if (session.status === "completed")
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "La semana ya fue cerrada",
    });

  const scenario = getScenarioById(input.scenarioId);
  if (!scenario)
    throw new TRPCError({ code: "BAD_REQUEST", message: "Actividad inválida" });

  const graded = await scoreActivity(input.scenarioId, input.payload, session.variant);

  // Una respuesta por (sesión, actividad): reenviar reemplaza la anterior.
  // respondida_at y opcion_id no se envían: en inserción toman su valor
  // por defecto y en actualización se conservan.
  must(
    await db()
      .from("sim_respuestas")
      .upsert(
        {
          sesion_id: input.sessionId,
          escenario_id: input.scenarioId,
          puntaje: Math.round(graded.score),
          payload: input.payload,
          ai_feedback: graded.aiFeedback,
        },
        { onConflict: "sesion_id,escenario_id" }
      )
  );
  return { ok: true as const };
}

export async function completeSession(sessionId: number) {
  const { session, answers } = await getSessionState(sessionId);
  if (session.status === "completed") {
    return {
      result: JSON.parse(session.resultJson ?? "{}") as EvaluationResult,
      alreadyCompleted: true,
    };
  }
  if (answers.length < MODULES.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Faltan días por cerrar (${answers.length}/${MODULES.length})`,
    });
  }

  const scoreByArea: Partial<Record<AreaId, number>> = {};
  for (const a of answers) {
    const scenario = getScenarioById(a.scenarioId);
    if (scenario) scoreByArea[scenario.area] = a.score;
  }
  const result = computeResult(scoreByArea);

  must(
    await db()
      .from("sim_sesiones")
      .update({
        estado: "completed",
        total_pct: result.totalPct,
        veredicto: result.verdict,
        resultado: result,
        completada_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("estado", "in_progress")
  );

  return { result, alreadyCompleted: false };
}

export async function getResult(sessionId: number) {
  const { session, participant } = await getSessionState(sessionId);
  if (session.status !== "completed" || !session.resultJson)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "La semana aún no concluye",
    });
  return {
    participant,
    session,
    result: JSON.parse(session.resultJson) as EvaluationResult,
  };
}

// ── Administración ────────────────────────────────────────────

export async function adminListSessions() {
  const rows =
    must(
      await db()
        .from("sim_sesiones")
        .select("*, sim_participantes(*), sim_respuestas(count)")
        .order("iniciada_at", { ascending: false })
        .limit(5000)
    ) ?? [];

  return rows
    .map((r: DbRow) => {
      const p = r.sim_participantes as DbRow | null;
      const counts = (r.sim_respuestas as { count: number }[] | null) ?? [];
      return {
        session: toSession(r),
        participant: p ? toParticipant(p) : null,
        answered: counts[0]?.count ?? 0,
      };
    })
    .filter(
      (r): r is { session: Session; participant: Participant; answered: number } =>
        r.participant !== null
    );
}

export async function adminDetail(sessionId: number) {
  const { session, participant, answers } = await getSessionState(sessionId);
  const detail = answers.map((a) => {
    const scenario = getScenarioById(a.scenarioId);
    return {
      scenarioId: a.scenarioId,
      scenarioTitle: scenario?.title ?? a.scenarioId,
      area: scenario?.area ?? null,
      score: a.score,
      payload: a.payload ? (JSON.parse(a.payload) as Record<string, unknown>) : null,
      aiFeedback: a.aiFeedback ?? "",
      answeredAt: a.answeredAt,
    };
  });
  // Historial del instructor: todas sus semanas (evolución entre intentos)
  const allSessions = (
    must(
      await db()
        .from("sim_sesiones")
        .select("*")
        .eq("participante_id", participant.id)
        .order("iniciada_at", { ascending: true })
    ) ?? []
  ).map(toSession);
  const history = allSessions.map((s) => ({
    id: s.id,
    attempt: s.attempt,
    variant: s.variant,
    status: s.status,
    totalPct: s.totalPct,
    verdict: s.verdict,
    startedAt: s.startedAt,
    completedAt: s.completedAt,
  }));
  return {
    session,
    participant,
    detail,
    history,
    result: session.resultJson
      ? (JSON.parse(session.resultJson) as EvaluationResult)
      : null,
  };
}

export async function adminCsv() {
  const list = await adminListSessions();
  const header =
    "Sesión;Intento;Variante;Fecha inicio;Fecha término;Nombre;No. empleado;Base;Estado;Días cerrados;Calificación global;Veredicto;Áreas a reforzar";
  const lines = list.map(({ session, participant, answered }) => {
    const result = session.resultJson
      ? (JSON.parse(session.resultJson) as EvaluationResult)
      : null;
    const weak = result
      ? result.areas
          .filter((a) => a.level === "reforzar")
          .map((a) => a.area)
          .join(", ")
      : "";
    const cells = [
      session.id,
      session.attempt,
      session.variant,
      session.startedAt.toISOString(),
      session.completedAt?.toISOString() ?? "",
      participant.name,
      participant.employeeNo,
      participant.base,
      session.status === "completed" ? "Completada" : "En progreso",
      `${answered}/${MODULES.length}`,
      session.totalPct ?? "",
      session.verdict ?? "",
      weak,
    ];
    return cells
      .map((c) => `"${String(c).replaceAll('"', '""')}"`)
      .join(";");
  });
  return [header, ...lines].join("\r\n");
}

export async function adminCsvDetail(sessionId: number) {
  const { participant, session, detail, result } =
    await adminDetail(sessionId);
  const lines: string[] = [];
  lines.push(`"Reporte individual — Simulador de semana laboral TM"`);
  lines.push(`"Nombre";"${participant.name}"`);
  lines.push(`"No. empleado";"${participant.employeeNo}"`);
  lines.push(`"Base";"${participant.base}"`);
  lines.push(`"Inicio";"${session.startedAt.toISOString()}"`);
  lines.push(
    `"Término";"${session.completedAt?.toISOString() ?? "En progreso"}"`
  );
  if (result) {
    lines.push(`"Calificación global";"${result.totalPct}%"`);
    lines.push(`"Veredicto";"${result.verdict}"`);
  }
  lines.push("");
  lines.push('"Actividad";"Área";"Puntaje (0-10)";"Análisis del evaluador"');
  for (const d of detail) {
    lines.push(
      [d.scenarioTitle, d.area ?? "", d.score, d.aiFeedback]
        .map((c) => `"${String(c).replaceAll('"', '""')}"`)
        .join(";")
    );
  }
  lines.push("");
  lines.push('"Respuestas textuales del participante"');
  for (const d of detail) {
    if (!d.payload) continue;
    const p = d.payload as Record<string, unknown>;
    const texts = [p.text, p.report, p.justification, p.diagnosis, p.verdict]
      .filter((x): x is string => typeof x === "string" && x.length > 0);
    for (const t of texts) {
      lines.push(
        [`${d.scenarioTitle}`, t]
          .map((c) => `"${String(c).replaceAll('"', '""')}"`)
          .join(";")
      );
    }
  }
  if (result && result.plan.length > 0) {
    lines.push("");
    lines.push('"Plan de mejora"');
    lines.push('"Área";"Prioridad";"Duración (semanas)";"Acciones"');
    for (const p of result.plan) {
      lines.push(
        [p.area, p.priority, p.durationWeeks, p.actions.join(" | ")]
          .map((c) => `"${String(c).replaceAll('"', '""')}"`)
          .join(";")
      );
    }
  }
  return lines.join("\r\n");
}
