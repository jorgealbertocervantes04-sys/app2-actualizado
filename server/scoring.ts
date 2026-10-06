// ─────────────────────────────────────────────────────────────
// Criterios de evaluación — SOLO SERVIDOR. Nunca importar desde
// el frontend: aquí viven las fallas plantadas, las rúbricas y
// los prompts del evaluador. El participante no debe verlos.
// ─────────────────────────────────────────────────────────────
import { generateObject } from "ai";
import { z } from "zod";
import { kimiGw } from "./ai/provider.js";
import { listModels, classifyAiError } from "./ai-client.js";

export interface ActivityScore {
  score: number; // 0-10
  aiFeedback: string; // análisis para el reporte del administrador
  detail: Record<string, unknown>; // desglose interno
  source: "ai" | "deterministic" | "fallback";
}

// ── Verdad plantada por actividad y variante ─────────────────
// Tres variantes (A/B/C) rotan por intento: las fallas y los
// momentos críticos cambian para que los escenarios no circulen
// entre cohortes. El contenido visible vive en contracts/course.ts.

interface VariantTruth {
  // d3 — inspección
  defects: string[];
  minor: string[];
  defectLabels: Record<string, string>;
  defectKeywords: Record<string, string[]>;
  // d4 — acompañamiento
  rideProblems: string[];
  rideLabels: Record<string, string>;
  // d5 — rúbrica de respaldo para la retroalimentación
  retroKeywords: { weight: number; anyOf: string[] }[];
}

const VARIANT_TRUTH: Record<string, VariantTruth> = {
  A: {
    defects: ["h4", "h5", "h6", "h7", "h10", "h12"],
    minor: ["h3", "h9"],
    defectLabels: {
      h4: "llanta interior trasera matriz 18 psi abajo",
      h5: "charco de aceite fresco bajo el cárter",
      h6: "quinta rueda sin grasa / plato reseco",
      h7: "pluma superior fundida en la caja",
      h10: "direccional trasera derecha intermitente acelerada (foco por morir)",
      h12: "aro del espejo lateral derecho flojo",
      h3: "basura y botella suelta en cabina",
      h9: "gato hidráulico suelto en caja de herramientas",
    },
    defectKeywords: {
      h4: ["llanta", "presión", "presion", "psi", "ponchad"],
      h5: ["aceite", "fuga", "charco", "cárter", "carter"],
      h6: ["quinta rueda", "grasa", "plato", "mordaza"],
      h7: ["pluma", "foco", "luz superior", "fundid"],
      h10: ["direccional", "intermitente"],
      h12: ["espejo"],
    },
    rideProblems: ["m1", "m3", "m5", "m7"],
    rideLabels: {
      m1: "arrancó y salió del patio sin cinturón de seguridad",
      m3: "uso del celular (lectura y dictado de mensaje) en movimiento",
      m5: "unidad detenida en caseta en neutral, sin freno de estacionamiento y con las manos fuera del volante",
      m7: "fumar y manejar un tramo con una sola mano en carretera",
      m2: "incorporación correcta a carretera",
      m4: "curvas con velocidad ajustada de entrada",
      m6: "rebase con técnica correcta",
      m8: "llegada con aviso por radio y plan de maniobra en voz alta",
    },
    retroKeywords: [
      { weight: 2, anyOf: ["cinturón", "cinturon"] },
      { weight: 2, anyOf: ["celular", "teléfono", "telefono", "mensaje"] },
      { weight: 1.5, anyOf: ["cigarro", "fumar", "una mano"] },
      { weight: 1.5, anyOf: ["freno de estacionamiento", "caseta", "neutral"] },
      { weight: 1.5, anyOf: ["bien", "correcto", "reconozco", "buen manejo", "de manual"] },
      { weight: 1.5, anyOf: ["acuerdo", "compromiso", "seguimiento", "próximo viaje", "proximo viaje", "revisar"] },
    ],
  },
  B: {
    defects: ["h1", "h5", "h8", "h9", "h10", "h11"],
    minor: ["h2", "h3"],
    defectLabels: {
      h1: "cortada profunda en el costado de la llanta delantera, con la cuerda visible",
      h5: "fuga de diésel por el tapón del tanque (charco fresco y olor a combustible)",
      h8: "lona de caja desgarrada y sello de la carga cortado",
      h9: "llanta exterior trasera de la caja 25 psi abajo",
      h10: "foco de freno trasero izquierdo muerto",
      h11: "defensa trasera floja (tornillos faltantes) y luces de placa fundidas",
      h2: "grasa vieja en manguera de dirección y servicio próximo a vencer",
      h3: "basura y botella suelta en cabina",
    },
    defectKeywords: {
      h1: ["cortada", "cuerda", "costado", "llanta delantera"],
      h5: ["diésel", "diesel", "combustible", "tapón", "tapon", "fuga"],
      h8: ["lona", "desgarre", "sello"],
      h9: ["llanta", "psi", "presión", "presion", "baja"],
      h10: ["freno", "foco", "pluma", "luz"],
      h11: ["defensa", "placa", "tornillos"],
    },
    rideProblems: ["m2", "m4", "m6", "m8"],
    rideLabels: {
      m2: "incorporación brusca a carretera sin direccional y sin ceder el paso",
      m4: "entró rápido a las curvas y frenó ya dentro de ellas",
      m6: "rebase en tramo de visibilidad corta, cruzando la raya continua y cerrando al torton",
      m8: "llegada sin aviso por radio, con maniobra improvisada que rozó el muelle",
      m1: "salida correcta: cinturón, espejos y arranque despacio",
      m3: "ignoró el celular y mantuvo la vista al frente",
      m5: "unidad asegurada con freno de estacionamiento en la caseta",
      m7: "ambas manos al volante y crucero constante en la recta",
    },
    retroKeywords: [
      { weight: 2, anyOf: ["direccional", "incorporación", "incorporacion", "cerró", "cerro", "ceder"] },
      { weight: 2, anyOf: ["curva", "frenó dentro", "freno dentro", "rápido", "rapido"] },
      { weight: 2, anyOf: ["rebase", "raya continua", "visibilidad", "torton"] },
      { weight: 1.5, anyOf: ["radio", "muelle", "maniobra", "avisar", "llegada"] },
      { weight: 1.5, anyOf: ["bien", "correcto", "reconozco", "buen manejo", "cinturón", "cinturon"] },
      { weight: 1.5, anyOf: ["acuerdo", "compromiso", "seguimiento", "próximo viaje", "proximo viaje", "revisar"] },
    ],
  },
  C: {
    defects: ["h2", "h4", "h6", "h7", "h9", "h12"],
    minor: ["h1", "h3"],
    defectLabels: {
      h2: "fuga activa en manguera de la dirección hidráulica y depósito bajo",
      h4: "llanta interior trasera matriz 18 psi abajo",
      h6: "manija de la mordaza sin su seguro (juego al tacto)",
      h7: "ninguna pluma superior enciende: arnés suelto colgando",
      h9: "tornamesa de la caja sin uno de sus seguros",
      h12: "estrella grande en el cristal, en la línea de visión",
      h1: "desgaste irregular leve en la llanta delantera",
      h3: "basura y botella suelta en cabina",
    },
    defectKeywords: {
      h2: ["dirección", "direccion", "hidráulic", "hidraulic", "manguera", "goteo"],
      h4: ["llanta", "psi", "presión", "presion"],
      h6: ["manija", "mordaza", "seguro", "quinta"],
      h7: ["plumas", "arnés", "arnes", "luces superiores", "no encienden"],
      h9: ["tornamesa", "seguro"],
      h12: ["cristal", "estrella", "parabrisas"],
    },
    rideProblems: ["m2", "m3", "m5", "m7"],
    rideLabels: {
      m2: "incorporación sin ceder el paso, cerrando a una unidad del carril principal",
      m3: "contestó una videollamada en movimiento, con la vista en la pantalla",
      m5: "bajó de la unidad en la caseta con el motor encendido, en neutral y sin freno de estacionamiento",
      m7: "exceso de velocidad sostenido (15 km/h arriba del límite) justificado por la prisa del cliente",
      m1: "salida correcta: cinturón y espejos antes de arrancar",
      m4: "curvas con velocidad ajustada de entrada",
      m6: "rebase con técnica correcta",
      m8: "llegada con aviso por radio y plan de maniobra en voz alta",
    },
    retroKeywords: [
      { weight: 2, anyOf: ["ceder", "incorporación", "incorporacion", "cerró", "cerro"] },
      { weight: 2, anyOf: ["videollamada", "celular", "teléfono", "telefono", "pantalla"] },
      { weight: 1.5, anyOf: ["motor encendido", "freno de estacionamiento", "caseta", "neutral", "bajó", "bajo"] },
      { weight: 1.5, anyOf: ["velocidad", "límite", "limite", "prisa", "exceso"] },
      { weight: 1.5, anyOf: ["bien", "correcto", "reconozco", "buen manejo", "de manual"] },
      { weight: 1.5, anyOf: ["acuerdo", "compromiso", "seguimiento", "próximo viaje", "proximo viaje", "revisar"] },
    ],
  },
};

function truthFor(variant: string | null | undefined): VariantTruth {
  return VARIANT_TRUTH[variant ?? "A"] ?? VARIANT_TRUTH.A;
}

// ── Esquema de respuesta del evaluador IA ─────────────────────

const aiVerdictSchema = z.object({
  score: z.number().min(0).max(10),
  feedback: z
    .string()
    .describe(
      "Análisis profesional en español para el administrador: qué hizo bien el participante, qué omitió y por qué importa. 3-6 oraciones, tono de auditoría."
    ),
  findings: z
    .array(z.string())
    .describe("Lista corta de los hallazgos clave detectados en la respuesta"),
  mentionedDefects: z
    .array(z.string())
    .optional()
    .describe("Solo inspección: ids de defectos mencionados en el reporte"),
});

type AiVerdict = z.infer<typeof aiVerdictSchema>;

let cachedModelId: string | null = null;

async function getModelId(): Promise<string> {
  if (cachedModelId) return cachedModelId;
  const { defaultModelId } = await listModels();
  cachedModelId = defaultModelId;
  return defaultModelId;
}

async function askEvaluator(
  system: string,
  user: string
): Promise<AiVerdict | null> {
  try {
    const modelId = await getModelId();
    const { object } = await generateObject({
      model: kimiGw(modelId),
      schema: aiVerdictSchema,
      system,
      prompt: user,
      providerOptions: { "kimi-gw": { max_completion_tokens: 1200 } },
    });
    return object;
  } catch (err) {
    // Degradación controlada: la actividad se puntúa con rúbrica local.
    const mapped = classifyAiError(err);
    console.warn(`[scoring] IA no disponible (${mapped.name}): ${mapped.message}`);
    return null;
  }
}

const clamp10 = (n: number) => Math.max(0, Math.min(10, Math.round(n * 10) / 10));

// ── Rúbricas de respaldo (sin IA) ─────────────────────────────

function keywordScore(
  text: string,
  groups: { weight: number; anyOf: string[] }[],
  base = 0
): { score: number; hit: string[] } {
  const t = text.toLowerCase();
  let score = base;
  const hit: string[] = [];
  for (const g of groups) {
    if (g.anyOf.some((k) => t.includes(k))) {
      score += g.weight;
      hit.push(g.anyOf[0]);
    }
  }
  return { score: clamp10(score), hit };
}

// ── Evaluadores por actividad ─────────────────────────────────

export async function scoreActivity(
  chapterId: string,
  payload: Record<string, unknown>,
  variant: string = "A"
): Promise<ActivityScore> {
  const truth = truthFor(variant);
  switch (chapterId) {
    case "d1":
      return scoreInduccion(String(payload.text ?? ""));
    case "d2":
      return scorePruebaManejo(
        String(payload.verdict ?? ""),
        String(payload.justification ?? "")
      );
    case "d3":
      return scoreInspeccion(
        Array.isArray(payload.tapped) ? (payload.tapped as string[]) : [],
        String(payload.report ?? ""),
        truth
      );
    case "d4":
      return scoreAcompanamiento(
        Array.isArray(payload.actions)
          ? (payload.actions as { momentId: string; action: string }[])
          : [],
        truth
      );
    case "d5":
      return scoreRetroalimentacion(String(payload.text ?? ""), truth);
    case "d6":
      return scoreRendimiento(
        Array.isArray(payload.tabsOpened)
          ? (payload.tabsOpened as string[])
          : [],
        String(payload.diagnosis ?? "")
      );
    case "d7":
      return scoreDecision(
        String(payload.verdict ?? ""),
        String(payload.justification ?? "")
      );
    default:
      return { score: 0, aiFeedback: "Actividad desconocida", detail: {}, source: "deterministic" };
  }
}

// d1 — Inducción
async function scoreInduccion(text: string): Promise<ActivityScore> {
  const ai = await askEvaluator(
    `Eres un auditor de capacitación de una flota de transporte de carga. Evalúas el PLAN DE INDUCCIÓN que un instructor de operadores propone para dos ingresos el mismo día: Pedro (veterano de 15 años, viene de otra flota, urge meterlo a ruta a las 11:00) y Ramón (novato, primer empleo, sale de escuela de operadores).
Criterios (0-10):
- Diagnóstico inicial: ¿propone conocer el punto de partida de cada uno antes de enseñar? (peso alto)
- Diferenciación: ¿trata distinto al veterano (validar/actualizar) que al novato (formar desde cero)? (peso alto)
- Contenido: seguridad, políticas, unidad, ruta, documentación, cultura.
- Verificación de aprendizaje: ¿comprueba que entendieron (examen, demostración práctica, preguntas)? (peso alto)
- Manejo de la presión de tiempo sin sacrificar lo crítico de seguridad.
Penaliza planes genéricos ("darles el curso de siempre a los dos juntos y rápido"). No infles: un plan mediocre merece 3-5.`,
    `Plan del instructor:\n"""${text}"""`
  );
  if (ai) {
    return { score: clamp10(ai.score), aiFeedback: ai.feedback, detail: { findings: ai.findings, text }, source: "ai" };
  }
  const kw = keywordScore(text, [
    { weight: 2.5, anyOf: ["diagnóstico", "diagnostico", "conocer", "punto de partida", "evaluación inicial", "evaluacion inicial", "entrevista"] },
    { weight: 2.5, anyOf: ["pedro", "veterano", "experiencia", "novato", "ramón", "ramon", "diferenciar", "por separado", "adaptar"] },
    { weight: 2, anyOf: ["seguridad", "políticas", "politicas", "reglamento"] },
    { weight: 2, anyOf: ["examen", "verificar", "comprobar", "evaluación", "evaluacion", "demostración", "demostracion", "práctica", "practica"] },
    { weight: 1, anyOf: ["práctica", "practica", "patio", "unidad"] },
  ]);
  return {
    score: kw.score,
    aiFeedback: `Evaluación por rúbrica (IA no disponible). Elementos detectados: ${kw.hit.join(", ") || "ninguno relevante"}.`,
    detail: { findings: kw.hit, text },
    source: "fallback",
  };
}

// d2 — Prueba de manejo (falla oculta: avanzó sin prueba de jalón ni verificación de mordaza)
async function scorePruebaManejo(verdict: string, justification: string): Promise<ActivityScore> {
  const full = `Dictamen: ${verdict}\nJustificación: ${justification}`;
  const ai = await askEvaluator(
    `Eres un auditor de seguridad de una flota de transporte de carga. Evalúas el DICTAMEN de un instructor sobre la prueba de manejo de un candidato (enrrampe + acople).
HECHOS DE LA PRUEBA (el participante los presenció):
- Enrrampe: correcto, al primer intento, bien referenciado.
- Acople: retrocedió, se escuchó el "clic" del enganche, y SIN BAJAR DE LA CABINA, SIN PRUEBA DE JALÓN y SIN VERIFICAR LA MORDAZA ni las líneas de aire/luz, encendió el motor y avanzó dos metros.
- El candidato presionó: "se escuchó el clic clarito, siempre jala, ya es tarde, ¿firmamos?"
LO CORRECTO: el clic audible NO garantiza el acople. La prueba de jalón y la verificación visual de la mordaza son obligatorias; omitirlas es una FALLA CRÍTICA de seguridad que por sí sola basta para NO aprobar la prueba (o exigir repetirla con el procedimiento completo), aunque el enrrampe haya sido perfecto.
Criterios (0-10):
- ¿Detectó la omisión de la prueba de jalón / verificación de la mordaza? (peso 60% — si no la detectó, la calificación no puede pasar de 3)
- ¿Su dictamen es congruente con la seguridad (no aprueba / reprueba / exige repetir)? (20%)
- ¿Justifica con hechos observados y no con simpatías? (20%)`,
    `Dictamen del instructor:\n"""${full}"""`
  );
  if (ai) {
    return { score: clamp10(ai.score), aiFeedback: ai.feedback, detail: { findings: ai.findings, verdict, justification }, source: "ai" };
  }
  const kw = keywordScore(full, [
    { weight: 5, anyOf: ["jalón", "jalon", "mordaza", "verificar el acople", "prueba de jalon", "no verificó", "no verifico", "sin verificar", "no bajó", "no bajo", "perno rey"] },
    { weight: 3, anyOf: ["no aprueba", "reprueba", "reprobar", "no apto", "repetir", "repita", "vuelva a hacer"] },
    { weight: 2, anyOf: ["seguridad", "riesgo", "falla crítica", "falla critica", "accidente", "se desprende", "desprendimiento"] },
  ]);
  return {
    score: kw.score,
    aiFeedback: `Evaluación por rúbrica (IA no disponible). Elementos detectados: ${kw.hit.join(", ") || "no detectó la omisión de la verificación de acople"}.`,
    detail: { findings: kw.hit, verdict, justification },
    source: "fallback",
  };
}

// d3 — Inspección con hotspots
async function scoreInspeccion(tapped: string[], report: string, truth: VariantTruth): Promise<ActivityScore> {
  const coverage = tapped.length / 12;
  const defectsSeen = truth.defects.filter((d) => tapped.includes(d));
  const minorSeen = truth.minor.filter((d) => tapped.includes(d));

  const ai = await askEvaluator(
    `Eres un auditor de mantenimiento de una flota de transporte. Un instructor inspeccionó una unidad y escribió un reporte. La unidad tenía estos defectos plantados:
CRÍTICOS: ${truth.defects.map((d) => `- ${d}: ${truth.defectLabels[d]}`).join("\n")}
MENORES: ${truth.minor.map((d) => `- ${d}: ${truth.defectLabels[d]}`).join("\n")}
El participante revisó físicamente estos puntos: [${tapped.join(", ")}] (defectos que llegó a ver: ${defectsSeen.join(", ") || "ninguno"}).
Evalúa el REPORTE ESCRITO (0-10):
- ¿Cuántos de los ${truth.defects.length} defectos críticos menciona el reporte? (peso 70% — es lo esencial; reporta en mentionedDefects los ids que mencione)
- ¿Distingue lo crítico de lo menor y propone acciones correctas (no liberar hasta reparar)? (30%)
NO uses conocimiento externo: puntúa solo contra la lista de defectos.`,
    `Reporte del instructor:\n"""${report}"""`
  );

  let reportScore: number;
  let mentioned: string[];
  let feedback: string;
  let source: ActivityScore["source"];
  if (ai) {
    mentioned = (ai.mentionedDefects ?? []).filter((d) =>
      [...truth.defects, ...truth.minor].includes(d as never)
    );
    reportScore = clamp10(ai.score);
    feedback = ai.feedback;
    source = "ai";
  } else {
    const t = report.toLowerCase();
    const keywordGroups = truth.defects.map((d) => ({
      weight: 1.3,
      anyOf: truth.defectKeywords[d] ?? [d],
    }));
    const kw = keywordScore(report, [
      ...keywordGroups,
      { weight: 2.2, anyOf: ["no liberar", "taller", "reparar", "antes de salir", "corregir"] },
    ]);
    reportScore = kw.score;
    mentioned = truth.defects.filter((d) =>
      (truth.defectKeywords[d] ?? []).some((k) => t.includes(k))
    );
    feedback = `Evaluación por rúbrica (IA no disponible). Defectos mencionados en el reporte: ${mentioned.length}/${truth.defects.length}.`;
    source = "fallback";
  }

  // Cobertura física 25% + reporte 75%
  const score = clamp10(10 * (0.25 * coverage) + 7.5 * (reportScore / 10));
  return {
    score,
    aiFeedback: `${feedback} — Recorrido físico: ${tapped.length}/12 puntos; defectos a la vista: ${defectsSeen.length}/${truth.defects.length} (menores: ${minorSeen.length}/${truth.minor.length}); defectos en reporte: ${mentioned.length}/${truth.defects.length}.`,
    detail: {
      tapped,
      coverage: Math.round(coverage * 100),
      defectsSeen,
      defectsMentioned: mentioned,
      reportScore,
      report,
    },
    source,
  };
}

// d4 — Acompañamiento (intervenciones)
async function scoreAcompanamiento(
  actions: { momentId: string; action: string }[],
  truth: VariantTruth
): Promise<ActivityScore> {
  const intervened = new Set(
    actions.filter((a) => a.action === "intervenir").map((a) => a.momentId)
  );
  const hits = truth.rideProblems.filter((m) => intervened.has(m));
  const missed = truth.rideProblems.filter((m) => !intervened.has(m));
  const falseAlarms = [...intervened].filter(
    (m) => !truth.rideProblems.includes(m)
  );
  const score = clamp10(10 * (hits.length / truth.rideProblems.length) - 1.5 * falseAlarms.length);

  const label = (m: string) => truth.rideLabels[m] ?? m;
  const feedbackParts: string[] = [];
  feedbackParts.push(
    hits.length
      ? `Intervino correctamente en: ${hits.map(label).join("; ")}.`
      : "No intervino en ninguna de las conductas de riesgo del viaje."
  );
  if (missed.length)
    feedbackParts.push(
      `Dejó pasar sin corregir: ${missed.map(label).join("; ")}.`
    );
  if (falseAlarms.length)
    feedbackParts.push(
      `Intervino en momentos que eran conducción correcta (${falseAlarms.map(label).join("; ")}): corregir lo correcto desgasta la autoridad del instructor.`
    );
  feedbackParts.push(
    "Durante el acompañamiento el instructor debe corregir las conductas de riesgo en el momento (cinturón, distracciones, asegurar la unidad detenida, respetar límites) y reconocer —no castigar— la buena conducción."
  );

  return {
    score,
    aiFeedback: feedbackParts.join(" "),
    detail: {
      actions,
      hits,
      missed,
      falseAlarms,
      intervened: [...intervened],
    },
    source: "deterministic",
  };
}

// d5 — Retroalimentación a Pedro
async function scoreRetroalimentacion(text: string, truth: VariantTruth): Promise<ActivityScore> {
  const problems = truth.rideProblems.map((m) => truth.rideLabels[m]);
  const goods = Object.keys(truth.rideLabels)
    .filter((m) => !truth.rideProblems.includes(m))
    .map((m) => truth.rideLabels[m]);
  const ai = await askEvaluator(
    `Eres un auditor de recursos humanos especializado en transporte de carga. Un instructor debe retroalimentar a Pedro, operador de 15 años de experiencia, defensivo ("nunca me habían citado", "llegamos a tiempo y sin un raspón").
CONDUCTAS DE RIESGO OBSERVADAS EN EL VIAJE (el instructor las tiene en su libreta): ${problems.join("; ")}. TAMBIÉN HIZO COSAS BIEN: ${goods.join("; ")}.
Evalúa la retroalimentación escrita (0-10):
- Específica: habla de conductas concretas observadas, no de generalidades ni del carácter de Pedro. (peso alto)
- Reconoce también lo que hizo bien (credibilidad ante un veterano). (peso medio-alto)
- Maneja la defensiva sin caer en choque de egos ni ceder por antigüedad. (peso alto)
- Cierra con acuerdo/plan de seguimiento concreto (qué cambiará, cuándo se revisa). (peso medio)
- Tono profesional: en privado, sin humillar, sin amenazas vacías.
Un discurso motivacional genérico sin conductas concretas merece 3-4. Regañar sin datos merece menos.`,
    `Retroalimentación del instructor:\n"""${text}"""`
  );
  if (ai) {
    return { score: clamp10(ai.score), aiFeedback: ai.feedback, detail: { findings: ai.findings, text }, source: "ai" };
  }
  const kw = keywordScore(text, truth.retroKeywords);
  return {
    score: kw.score,
    aiFeedback: `Evaluación por rúbrica (IA no disponible). Elementos detectados: ${kw.hit.join(", ") || "ninguno relevante"}.`,
    detail: { findings: kw.hit, text },
    source: "fallback",
  };
}

// d6 — Rendimiento (verdad: no es el operador, es la unidad)
async function scoreRendimiento(tabsOpened: string[], diagnosis: string): Promise<ActivityScore> {
  const ai = await askEvaluator(
    `Eres un auditor de operaciones de una flota de transporte de carga. La unidad 247 rinde 2.41 km/L vs 2.83 km/L del promedio de flota del mismo modelo. Todos en operaciones culpan al operador ("maneja muy pesado") y piden un curso correctivo.
LOS DATOS REALES:
- Telemetría del operador actual: MEJOR que la flota (ralentí 6.2% vs 8.1%, menos frenadas bruscas, RPM en rango eficiente, 71% de crucero).
- La 247 rindió mal con TRES operadores distintos (2.38, 2.41, 2.44 km/L): el problema viaja con la unidad, no con el conductor.
- Bitácora: servicio mayor hace 11 meses; reporte de "pérdida de potencia en subidas" sin atender desde hace 5 semanas; bomba de inyección original con 412,000 km sin calibración.
- Ruta plana, carga normal; otras unidades en la misma ruta rinden 2.79-2.86.
LA CONCLUSIÓN CORRECTA: NO es el operador. La evidencia apunta a causa mecánica (bomba de inyección / pérdida de potencia sin atender). La acción correcta es orden de trabajo a taller y re-medición, no un curso correctivo al operador (que además sería injusto).
El participante abrió estas pestañas de datos: [${tabsOpened.join(", ") || "ninguna"}] de 4 disponibles.
Evalúa su conclusión (0-10):
- ¿Descarta al operador CON DATOS (telemetría buena, 3 operadores con el mismo mal rendimiento)? (peso 55% — si culpa al operador, máximo 3)
- ¿Identifica la causa mecánica probable con la bitácora? (30%)
- ¿Propone acción concreta y ordenada (taller primero, re-medir después)? (15%)`,
    `Conclusión del instructor:\n"""${diagnosis}"""`
  );
  if (ai) {
    return {
      score: clamp10(ai.score),
      aiFeedback: `${ai.feedback} — Pestañas de datos consultadas: ${tabsOpened.length}/4.`,
      detail: { findings: ai.findings, tabsOpened, diagnosis },
      source: "ai",
    };
  }
  const kw = keywordScore(diagnosis, [
    { weight: 3.5, anyOf: ["no es el operador", "no es el conductor", "descartar al operador", "tres operadores", "3 operadores", "todos los operadores", "la unidad", "problema de la unidad", "mecánico", "mecanico"] },
    { weight: 3, anyOf: ["bomba", "inyección", "inyeccion", "potencia", "calibración", "calibracion", "mantenimiento", "taller"] },
    { weight: 2, anyOf: ["telemetría", "telemetria", "datos", "ralentí", "ralenti", "crucero"] },
    { weight: 1.5, anyOf: ["orden de trabajo", "revisión", "revision", "re-medir", "remedir", "medir después", "medir despues"] },
  ]);
  return {
    score: kw.score,
    aiFeedback: `Evaluación por rúbrica (IA no disponible). Elementos detectados: ${kw.hit.join(", ") || "no descartó al operador con datos"}. Pestañas consultadas: ${tabsOpened.length}/4.`,
    detail: { findings: kw.hit, tabsOpened, diagnosis },
    source: "fallback",
  };
}

// d7 — Decisión sobre Ramón
async function scoreDecision(verdict: string, justification: string): Promise<ActivityScore> {
  const full = `Decisión: ${verdict}\nFundamento: ${justification}`;
  const ai = await askEvaluator(
    `Eres un auditor de operaciones de una flota de transporte. Un instructor debe decidir el expediente del candidato Ramón Ibarra.
EL EXPEDIENTE:
- Maniobras de re-evaluación: excelentes, de manual (enrrampe, acople, desacople).
- PERO en su primer acople avanzó SIN prueba de jalón ni verificación de mordaza (falla crítica de seguridad).
- Llegó 40 min tarde a su primera evaluación, sin avisar.
- En entrevista culpó a la unidad de cada observación; su historia del empleo anterior cambió dos veces.
- Referencias SIN verificar (el número no contesta).
- PRESIÓN: hay 3 rutas sin operador con costo de $18,000 diarios; la gerente pide decidir hoy y sugiere "no pensarle tanto".
CRITERIO: la técnica no compensa una actitud de riesgo documentada (omisión de seguridad + impuntualidad + no hacerse responsable + historia inconsistente). Decisiones sólidas: NO contratar, o condicionar de forma muy estricta (verificar referencias primero, re-evaluación completa con verificación de acople supervisada, periodo de prueba con acompañamiento). CONTRATAR DE INMEDIATO por la presión operativa es la decisión débil.
Evalúa (0-10):
- ¿Pesa la actitud y la seguridad por encima de la técnica y de la presión de las 3 rutas? (peso 50% — contratar de inmediato sin condiciones no puede pasar de 3)
- Si condiciona: ¿las condiciones son concretas y verificables (referencias, re-evaluación, supervisión)? 
- ¿Fundamenta con el expediente y asume la responsabilidad de su firma? (20%)`,
    `Decisión del instructor:\n"""${full}"""`
  );
  if (ai) {
    return { score: clamp10(ai.score), aiFeedback: ai.feedback, detail: { findings: ai.findings, verdict, justification }, source: "ai" };
  }
  const kw = keywordScore(full, [
    { weight: 3, anyOf: ["no contratar", "rechazar", "no apto", "no lo contrato", "condicion"] },
    { weight: 2.5, anyOf: ["referencias", "verificar", "verificación", "verificacion"] },
    { weight: 2, anyOf: ["actitud", "responsabilidad", "culpa", "impuntual", "tarde"] },
    { weight: 1.5, anyOf: ["seguridad", "jalón", "jalon", "mordaza", "acople"] },
    { weight: 1, anyOf: ["re-evaluación", "re-evaluacion", "periodo de prueba", "acompañamiento", "acompanamiento", "supervis"] },
  ]);
  return {
    score: kw.score,
    aiFeedback: `Evaluación por rúbrica (IA no disponible). Elementos detectados: ${kw.hit.join(", ") || "decisión sin fundamento detectable"}.`,
    detail: { findings: kw.hit, verdict, justification },
    source: "fallback",
  };
}
