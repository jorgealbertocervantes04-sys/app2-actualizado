// ─────────────────────────────────────────────────────────────
// Lógica de datos — almacenamiento en Google Sheets vía
// Apps Script (api/queries/sheets.ts). Sin base de datos SQL.
// ─────────────────────────────────────────────────────────────
import {
  MODULES,
  VARIANTS,
  computeResult,
  getScenarioById,
  type AreaId,
  type EvaluationResult,
} from "@contracts/course";
import { scoreActivity } from "../scoring";
import { appendRow, readSheet, updateRow, type Row } from "./sheets";
import { TRPCError } from "@trpc/server";

const ADMIN_CODE = process.env.ADMIN_CODE ?? "ADMIN-2026";

export function assertAdmin(code: string) {
  const normalize = (s: string) => s.trim().toUpperCase();
  if (normalize(code) !== normalize(ADMIN_CODE)) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Clave incorrecta" });
  }
}

// ── Tipos (filas de las hojas) ────────────────────────────────

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

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const num = (v: unknown) => Number(v ?? 0);
const date = (v: unknown) => (v ? new Date(str(v)) : null);

function toParticipant(r: Row): Participant {
  return {
    id: num(r.id),
    name: str(r.name),
    employeeNo: str(r.employeeNo),
    base: str(r.base),
    createdAt: date(r.createdAt) ?? new Date(),
  };
}

function toSession(r: Row): Session {
  return {
    id: num(r.id),
    participantId: num(r.participantId),
    status: str(r.status) === "completed" ? "completed" : "in_progress",
    totalPct: r.totalPct === null ? null : num(r.totalPct),
    verdict: r.verdict === null ? null : str(r.verdict),
    resultJson: r.resultJson === null ? null : str(r.resultJson),
    variant: r.variant === null || r.variant === undefined ? "A" : str(r.variant) || "A",
    attempt: r.attempt === null || r.attempt === undefined || r.attempt === "" ? 1 : num(r.attempt),
    startedAt: date(r.startedAt) ?? new Date(),
    completedAt: date(r.completedAt),
  };
}

function toResponse(r: Row): ResponseRow {
  return {
    id: num(r.id),
    sessionId: num(r.sessionId),
    scenarioId: str(r.scenarioId),
    optionId: str(r.optionId),
    score: num(r.score),
    payload: r.payload === null ? null : str(r.payload),
    aiFeedback: r.aiFeedback === null ? null : str(r.aiFeedback),
    answeredAt: date(r.answeredAt) ?? new Date(),
  };
}

// ── Participantes y sesiones ──────────────────────────────────

export async function startOrResume(input: {
  name: string;
  employeeNo: string;
  base: string;
}) {
  const participantRows = await readSheet("participants");
  let participant = participantRows
    .map(toParticipant)
    .find((p) => p.employeeNo === input.employeeNo);

  if (!participant) {
    const row = await appendRow("participants", {
      name: input.name,
      employeeNo: input.employeeNo,
      base: input.base,
      createdAt: new Date().toISOString(),
    });
    participant = toParticipant(row);
  } else if (participant.name !== input.name || participant.base !== input.base) {
    await updateRow("participants", "id", participant.id, {
      name: input.name,
      base: input.base,
    });
    participant = { ...participant, name: input.name, base: input.base };
  }

  // Reanudar sesión en progreso si existe
  const sessionRows = (await readSheet("sessions")).map(toSession);
  const mine = sessionRows.filter((s) => s.participantId === participant.id);
  let session = mine
    .filter((s) => s.status === "in_progress")
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())[0];
  let resumed = true;
  if (!session) {
    // Intento n = sesiones previas del participante + 1. La variante
    // rota por intento: quien re-simula nunca repite escenario.
    const attempt = mine.length + 1;
    const variant = VARIANTS[(attempt - 1) % VARIANTS.length];
    const row = await appendRow("sessions", {
      participantId: participant.id,
      status: "in_progress",
      variant,
      attempt,
      startedAt: new Date().toISOString(),
    });
    session = toSession(row);
    resumed = false;
  }
  return { participant, session, resumed };
}

export async function getSessionState(sessionId: number) {
  const sessions = (await readSheet("sessions")).map(toSession);
  const session = sessions.find((s) => s.id === sessionId);
  if (!session)
    throw new TRPCError({ code: "NOT_FOUND", message: "Sesión no encontrada" });

  const participants = (await readSheet("participants")).map(toParticipant);
  const participant = participants.find((p) => p.id === session.participantId);
  if (!participant)
    throw new TRPCError({ code: "NOT_FOUND", message: "Participante no encontrado" });

  const answers = (await readSheet("responses"))
    .map(toResponse)
    .filter((r) => r.sessionId === sessionId);
  return { session, participant, answers };
}

// ── Actividades (la puntuación se calcula en servidor) ───────

export async function saveActivity(input: {
  sessionId: number;
  scenarioId: string;
  payload: Record<string, unknown>;
}) {
  const sessions = (await readSheet("sessions")).map(toSession);
  const session = sessions.find((s) => s.id === input.sessionId);
  if (!session)
    throw new TRPCError({ code: "NOT_FOUND", message: "Sesión no encontrada" });
  if (session.status === "completed")
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "La semana ya fue cerrada",
    });

  const scenario = getScenarioById(input.scenarioId);
  if (!scenario)
    throw new TRPCError({ code: "BAD_REQUEST", message: "Actividad inválida" });

  const graded = await scoreActivity(input.scenarioId, input.payload, session.variant);
  const scoreInt = Math.round(graded.score);
  const payloadJson = JSON.stringify(input.payload);

  const existing = (await readSheet("responses"))
    .map(toResponse)
    .find(
      (r) => r.sessionId === input.sessionId && r.scenarioId === input.scenarioId
    );

  if (existing) {
    await updateRow("responses", "id", existing.id, {
      score: scoreInt,
      payload: payloadJson,
      aiFeedback: graded.aiFeedback,
    });
  } else {
    await appendRow("responses", {
      sessionId: input.sessionId,
      scenarioId: input.scenarioId,
      optionId: "act",
      score: scoreInt,
      payload: payloadJson,
      aiFeedback: graded.aiFeedback,
      answeredAt: new Date().toISOString(),
    });
  }
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

  await updateRow("sessions", "id", sessionId, {
    status: "completed",
    totalPct: result.totalPct,
    verdict: result.verdict,
    resultJson: JSON.stringify(result),
    completedAt: new Date().toISOString(),
  });

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
  const [sessions, participants, responses] = await Promise.all([
    readSheet("sessions"),
    readSheet("participants"),
    readSheet("responses"),
  ]);
  const parts = participants.map(toParticipant);
  const resps = responses.map(toResponse);

  return sessions
    .map(toSession)
    .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
    .map((session) => ({
      session,
      participant: parts.find((p) => p.id === session.participantId)!,
      answered: resps.filter((r) => r.sessionId === session.id).length,
    }))
    .filter((r) => r.participant);
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
  const allSessions = (await readSheet("sessions"))
    .map(toSession)
    .filter((s) => s.participantId === participant.id)
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
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
