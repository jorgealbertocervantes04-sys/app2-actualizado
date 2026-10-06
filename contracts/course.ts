// ─────────────────────────────────────────────────────────────
// "La Semana en TM" — simulador inmersivo de trabajo.
// El participante NUNCA ve puntajes ni opciones correctas:
// realiza su trabajo (inducciones, pruebas, inspecciones,
// acompañamientos, diagnósticos) y la medición ocurre en el
// servidor. Este archivo solo contiene contenido visible.
// Los criterios de evaluación viven en api/scoring.ts (servidor).
// ─────────────────────────────────────────────────────────────

export type AreaId = "IND" | "MAN" | "INS" | "DET" | "REN" | "RET" | "DEC";

export interface AreaDef {
  id: AreaId;
  name: string;
  short: string;
  description: string;
}

export const AREAS: AreaDef[] = [
  { id: "IND", name: "Inducción y formación", short: "Inducción", description: "Capacidad de impartir inducciones que preparen al operador y detecten su punto de partida." },
  { id: "MAN", name: "Evaluación de maniobras", short: "Maniobras", description: "Criterio para evaluar enrrampe, acople y desacople con rigor y seguridad." },
  { id: "INS", name: "Inspección de unidades", short: "Inspección", description: "Exigencia y método para verificar inspecciones sistemáticas." },
  { id: "DET", name: "Detección de hábitos y aptitudes", short: "Detección", description: "Habilidad para identificar malos hábitos, actitudes de riesgo y aptitudes." },
  { id: "REN", name: "Diagnóstico de rendimiento", short: "Rendimiento", description: "Capacidad de investigar malos rendimientos con datos antes de atribuir causas." },
  { id: "RET", name: "Retroalimentación y acompañamiento", short: "Retroalimentación", description: "Forma de acompañar y retroalimentar: oportuna, específica y documentada." },
  { id: "DEC", name: "Criterio de decisión sobre operadores", short: "Decisión", description: "Criterio para aprobar, condicionar o rechazar operadores." },
];

export type Speaker = "narrador" | "gerente" | "operador" | "candidato" | "instructor";

export const SPEAKER_META: Record<
  Speaker,
  { name: string; role: string; img?: string; side: "left" | "right" | "none" }
> = {
  narrador: { name: "", role: "", side: "none" },
  instructor: { name: "Tú", role: "Instructor de operadores", img: "/scenes/instructor.png", side: "left" },
  gerente: { name: "Marcela Duarte", role: "Gerente de operaciones", img: "/scenes/gerente.png", side: "right" },
  operador: { name: "Pedro Almazán", role: "Operador · 15 años de experiencia", img: "/scenes/operador.png", side: "right" },
  candidato: { name: "Ramón Ibarra", role: "Candidato a operador", img: "/scenes/candidato.png", side: "right" },
};

// ── Tipos de actividad ────────────────────────────────────────

export interface FreeTextActivity {
  kind: "freetext";
  prompt: string;
  hint: string;
  minChars: number;
}

export interface Hotspot {
  id: string;
  x: number; // % del ancho
  y: number; // % del alto
  label: string;
  seen: string; // lo que el participante observa al revisar ese punto
}

export interface InspectionActivity {
  kind: "inspection";
  image: string;
  brief: string;
  hotspots: Hotspot[];
  reportPrompt: string;
}

export interface RideMoment {
  id: string;
  time: string;
  text: string;
}

export interface RideAlongActivity {
  kind: "ridealong";
  image: string;
  brief: string;
  moments: RideMoment[];
}

export interface TelemetryTab {
  id: string;
  title: string;
  rows: { k: string; v: string }[];
}

export interface TelemetryActivity {
  kind: "telemetry";
  image: string;
  brief: string;
  tabs: TelemetryTab[];
  prompt: string;
}

export interface DecisionActivity {
  kind: "decision";
  image: string;
  brief: string;
  file: { k: string; v: string }[];
  prompt: string;
}

export type Activity =
  | FreeTextActivity
  | InspectionActivity
  | RideAlongActivity
  | TelemetryActivity
  | DecisionActivity;

export interface Chapter {
  id: string;
  num: string;
  area: AreaId;
  day: string;
  title: string;
  scene: string;
  location: string;
  intro: { speaker: Speaker; text: string }[];
  activity: Activity;
  outro: string;
}

// ── La semana ─────────────────────────────────────────────────

export const CHAPTERS: Chapter[] = [
  {
    id: "d1",
    num: "01",
    area: "IND",
    day: "Lunes · 06:45",
    title: "Inducción de ingreso",
    scene: "/tm/oficina.jpg",
    location: "Sala de inducciones · TM",
    intro: [
      {
        speaker: "gerente",
        text: "Buenos días. Hoy te toca la inducción de dos ingresos: Pedro Almazán, quince años de experiencia, viene de otra flota… y Ramón Ibarra, recién egresado de la escuela de operadores, su primer empleo.",
      },
      {
        speaker: "gerente",
        text: "La ruta de Monterrey sale a las 11 y me urge meter a Pedro. Haz lo que tengas que hacer, pero necesito la sala libre antes de las 10. ¿Cómo la vas a manejar?",
      },
    ],
    activity: {
      kind: "freetext",
      prompt:
        "Describe cómo vas a llevar la inducción de hoy con estos dos ingresos: qué vas a cubrir, en qué orden y cómo te vas a asegurar de que ambos salgan listos para operar.",
      hint: "Escribe como si le explicaras tu plan a Marcela. Sé concreto: qué haces primero, qué después, y cómo cierras.",
      minChars: 120,
    },
    outro:
      "Marcela asiente, toma tu plan y sale a reagendar la ruta. A las 10:00 la sala queda libre y los dos ingresos pasan a patio.",
  },
  {
    id: "d2",
    num: "02",
    area: "MAN",
    day: "Martes · 17:20",
    title: "Prueba de manejo",
    scene: "/tm/cabina.jpg",
    location: "Patio de maniobras · TM",
    intro: [
      {
        speaker: "narrador",
        text: "Última prueba del día. Llevas tres evaluaciones desde la mañana y tu familia te espera para cenar. Falta solo el dictamen de Ramón Ibarra: enrrampe y acople.",
      },
      {
        speaker: "narrador",
        text: "Ramón se estaciona frente a la rampa. Retrocede despacio, bien referenciado, y deja la caja alineada al primer intento. Los jóvenes del turno silban desde el andén. No está mal, piensas.",
      },
      {
        speaker: "narrador",
        text: "Luego toma el tractocamión para el acople. Retrocede hacia la caja… CLAC. El enganche suena seco. Ramón enciende el motor, suelta el freno de estacionamiento y avanza dos metros hasta la zona de sellos.",
      },
      {
        speaker: "candidato",
        text: "¿Vio? Se escuchó el clic clarito. Siempre jala. Ya es tarde, instructor… ¿firmamos?",
      },
    ],
    activity: {
      kind: "decision",
      image: "/tm/cabina.jpg",
      brief:
        "Tienes la hoja de la prueba en la mano. Ramón espera tu dictamen junto a la unidad.",
      file: [
        { k: "Candidato", v: "Ramón Ibarra · 24 años" },
        { k: "Enrrampe", v: "Al primer intento, bien referenciado" },
        { k: "Acople", v: "Retroceso controlado, sonido de enganche audible" },
        { k: "Hora", v: "17:42 · último dictamen del día" },
      ],
      prompt:
        "Escribe tu dictamen: qué observaste en la prueba, si aprueba o no, y por qué.",
    },
    outro:
      "Ramón toma tu hoja, la lee dos veces y se va a casilleros sin decir mucho. Guardas tus cosas: mañana toca inspección de la 312.",
  },
  {
    id: "d3",
    num: "03",
    area: "INS",
    day: "Miércoles · 08:10",
    title: "Inspección de la unidad 312",
    scene: "/tm/unidad-lado.jpg",
    location: "Andén de salida · TM",
    intro: [
      {
        speaker: "gerente",
        text: "La 312 sale hoy a las 9:30 con carga de un cliente nuevo. Antes de liberarla quiero que pases tu propia inspección: el operador dice que «todo bien», pero ya sabes cómo son los todo-bien.",
      },
      {
        speaker: "narrador",
        text: "La unidad está sola en el andén. Tienes tu linterna, tu libreta y veinte minutos antes de que llegue el operador.",
      },
    ],
    activity: {
      kind: "inspection",
      image: "/tm/unidad-lado.jpg",
      brief:
        "Toca cada punto de la unidad para revisarlo de cerca. Cuando termines tu recorrido, escribe tu reporte.",
      hotspots: [
        { id: "h1", x: 10, y: 67, label: "Llanta delantera", seen: "Presión correcta, labrado parejo, sin cortadas. Tuerca 3 con marca de torque alineada." },
        { id: "h2", x: 7, y: 55, label: "Cofre y motor", seen: "Nivel de aceite en rango. Rastros frescos de grasa en la manguera de dirección; al tacto, la grasa está fría." },
        { id: "h3", x: 18, y: 63, label: "Cabina y escalones", seen: "Escalón inferior firme, pasamanos sin juego. En el piso de cabina, papeles y una botella suelta." },
        { id: "h4", x: 41, y: 67, label: "Llantas matrices", seen: "Doble rodada con presión pareja… excepto la interior trasera: 18 psi abajo y el labrado se ve más hundido." },
        { id: "h5", x: 31, y: 62, label: "Tanque y bajos", seen: "Tanque sin golpes, tapón con sello. Bajo el cárter, un charco de aceite del tamaño de una palma, aún brillante." },
        { id: "h6", x: 48, y: 56, label: "Quinta rueda", seen: "Mordaza cerrada sobre el perno rey, manija en su seguro. Falta grasa en el plato: se nota reseco y con viruta." },
        { id: "h7", x: 52, y: 17, label: "Luces superiores de caja", seen: "Las cinco plumas frontales encienden… menos la segunda de izquierda a derecha: foco fundido." },
        { id: "h8", x: 70, y: 42, label: "Lateral de caja", seen: "Lona sin raspaduras nuevas, puertas con bisagras firmes. El sello de la carga anterior aún puesto." },
        { id: "h9", x: 87, y: 67, label: "Llantas de caja", seen: "Presión pareja en las ocho. Tornamesa con sus seguros. Un gato hidráulico va suelto en la caja de herramientas." },
        { id: "h10", x: 97, y: 42, label: "Puertas traseras y luces", seen: "Puertas cierran parejas, chapa sin juego. Direccional derecha trasera intermitente muy rápida: un foco a punto de morir." },
        { id: "h11", x: 94, y: 61, label: "Defensa y placa", seen: "Defensa recta, placa legible, luces de placa funcionando." },
        { id: "h12", x: 15, y: 47, label: "Espejos y cristal", seen: "Espejo lateral derecho con el aro flojo: se mueve con el dedo. Cristal sin estrellas." },
      ],
      reportPrompt:
        "Escribe tu reporte de inspección para Marcela: qué encontraste y qué debe pasar antes de liberar la unidad.",
    },
    outro:
      "Entregas tu reporte. Marcela lo lee, marca dos puntos con el plumón y llama al taller por radio. La 312 esperará un rato más.",
  },
  {
    id: "d4",
    num: "04",
    area: "DET",
    day: "Jueves · 06:00",
    title: "Acompañamiento a ruta",
    scene: "/tm/interior-cabina.jpg",
    location: "Ruta TM-114 · Tramo carretero",
    intro: [
      {
        speaker: "gerente",
        text: "Hoy te vas de acompañamiento con Pedro Almazán en la ruta de Matehuala. Es su segunda semana. No quiero un paseo: quiero saber cómo trabaja cuando cree que nadie lo está calificando.",
      },
      {
        speaker: "operador",
        text: "Súbete. Eso sí, yo manejo como siempre: si vienes a dictar cátedra, mejor te bajas en la primera caseta.",
      },
    ],
    activity: {
      kind: "ridealong",
      image: "/tm/interior-cabina.jpg",
      brief:
        "El viaje avanza solo. Cuando veas algo que amerite tu intervención como instructor, toca «Intervenir». Si todo va bien, toca «Seguir».",
      moments: [
        { id: "m1", time: "06:05", text: "Pedro arranca. Sube a cabina sin abrocharse el cinturón: «aquí en el patio no estorba», murmura, y sale del andén así." },
        { id: "m2", time: "06:20", text: "En la incorporación a la carretera cede el paso a dos unidades, pone direccional con tiempo y toma su carril con suavidad." },
        { id: "m3", time: "06:45", text: "Suena su celular. Lo toma, lee la pantalla unos segundos y dicta un mensaje de voz mientras mantiene la vista al frente. La unidad no se desvía." },
        { id: "m4", time: "07:10", text: "Zona de curvas amplias. Pedro ajusta la velocidad antes de entrar, sale limpio de cada una y comenta: «aquí siempre hay patrulla»." },
        { id: "m5", time: "07:40", text: "En la caseta, la fila se detiene. Pedro deja la unidad en neutral, suelta el freno de servicio y apoya ambos antebrazos en el volante mientras busca cambio en la guantera." },
        { id: "m6", time: "08:05", text: "Rebase a un torton: pone direccional, espera visibilidad completa, pasa firme y regresa a su carril dejando buen margen." },
        { id: "m7", time: "08:30", text: "Entra a la recta larga antes de Matehuala. Pedro baja la ventanilla, enciende un cigarro y maneja un tramo con una sola mano, la otra fuera de la cabina." },
        { id: "m8", time: "08:50", text: "A 2 km del destino reduce la velocidad, avisa por radio su llegada al cliente y repasa en voz alta el plan de maniobra para el enrrampe." },
      ],
    },
    outro:
      "Llegan a Matehuala sin contratiempos. Pedro estaciona la caja de una sola maniobra y te mira de reojo: «¿Y bien?». Anotas todo en tu libreta. La conversación queda para mañana.",
  },
  {
    id: "d5",
    num: "05",
    area: "RET",
    day: "Viernes · 16:30",
    title: "La conversación pendiente",
    scene: "/tm/rampa.jpg",
    location: "Oficina de patio · TM",
    intro: [
      {
        speaker: "narrador",
        text: "Tu libreta del jueves tiene anotaciones del viaje con Pedro. Hoy lo citaste a las 16:30 en la oficina de patio. Entra con los brazos cruzados.",
      },
      {
        speaker: "operador",
        text: "A ver, instructor. Quince años manejando y nunca me habían citado. Si es por lo de ayer, llegamos a tiempo, sin un raspón y con el cliente contento. ¿Cuál es el problema?",
      },
    ],
    activity: {
      kind: "freetext",
      prompt:
        "¿Qué le dices a Pedro? Escribe exactamente cómo abrirías la conversación y qué le dirías sobre lo que observaste en el viaje.",
      hint: "Escribe tus palabras tal como se las dirías, como en una conversación real.",
      minChars: 120,
    },
    outro:
      "Pedro escucha, aprieta la mandíbula un par de veces y termina diciendo «ya veremos». Sale de la oficina despacio. Lo que pase el lunes lo dirá todo.",
  },
  {
    id: "d6",
    num: "06",
    area: "REN",
    day: "Sábado · 09:00",
    title: "El caso de la unidad 247",
    scene: "/tm/taller.jpg",
    location: "Taller · Bahía de diagnóstico · TM",
    intro: [
      {
        speaker: "gerente",
        text: "Antes de que cierres la semana: la 247 es la peor unidad de la flota en rendimiento. En operaciones todos dicen lo mismo —su operador maneja muy pesado— y me piden que le des un curso correctivo el lunes.",
      },
      {
        speaker: "gerente",
        text: "Aquí tienes acceso a los datos de la unidad. Revísalos y dime qué hacemos: ¿curso al operador el lunes o qué?",
      },
    ],
    activity: {
      kind: "telemetry",
      image: "/tm/taller.jpg",
      brief:
        "Abre las pestañas que necesites para revisar los datos de la 247 y luego escribe tu conclusión.",
      tabs: [
        {
          id: "t1",
          title: "Telemetría del operador (30 días)",
          rows: [
            { k: "Ralentí promedio", v: "6.2% (flota: 8.1%)" },
            { k: "Frenadas bruscas", v: "0.4 por 100 km (flota: 0.9)" },
            { k: "Excesos de velocidad", v: "2 eventos leves en 30 días" },
            { k: "RPM promedio en marcha", v: "1,310 (rango eficiente)" },
            { k: "Uso de crucero", v: "71% del tramo carretero" },
          ],
        },
        {
          id: "t2",
          title: "Rendimiento histórico de la 247",
          rows: [
            { k: "Últimos 30 días (op. actual)", v: "2.41 km/L" },
            { k: "Hace 60 días (op. anterior)", v: "2.38 km/L" },
            { k: "Hace 90 días (otro operador)", v: "2.44 km/L" },
            { k: "Promedio de flota (mismo modelo)", v: "2.83 km/L" },
          ],
        },
        {
          id: "t3",
          title: "Bitácora de mantenimiento",
          rows: [
            { k: "Último servicio mayor", v: "Hace 11 meses" },
            { k: "Reporte pendiente", v: "«Pérdida de potencia en subidas» (hace 5 semanas, sin atender)" },
            { k: "Bomba de inyección", v: "Original · 412,000 km · sin calibración registrada" },
            { k: "Llantas", v: "Presión verificada hace 2 días: correcta" },
          ],
        },
        {
          id: "t4",
          title: "Ruta asignada",
          rows: [
            { k: "Tramo", v: "Plano · 87% autopista" },
            { k: "Carga promedio", v: "24 t (dentro de rango)" },
            { k: "Otras unidades en la misma ruta", v: "2.79–2.86 km/L" },
          ],
        },
      ],
      prompt:
        "Escribe tu conclusión para Marcela: qué le pasa a la 247, en qué datos te basas y qué acción propones para el lunes.",
    },
    outro:
      "Marcela lee tu conclusión y levanta el teléfono para hablar con el jefe de taller. El lunes habrá una orden de trabajo distinta a la que todos esperaban.",
  },
  {
    id: "d7",
    num: "07",
    area: "DEC",
    day: "Sábado · 12:30",
    title: "El expediente de Ramón",
    scene: "/tm/patio.jpg",
    location: "Oficina de operaciones · TM",
    intro: [
      {
        speaker: "gerente",
        text: "Último pendiente: el expediente de Ramón Ibarra. Repitió sus maniobras esta semana y técnicamente quedó de los mejores candidatos del año. Necesito tu decisión hoy.",
      },
      {
        speaker: "gerente",
        text: "Ah, y antes de que decidas: tengo tres rutas sin operador desde el lunes. Piénsale, pero no tanto.",
      },
      {
        speaker: "narrador",
        text: "Sobre el escritorio, el expediente completo de la semana. Todo lo que pasó con Ramón está ahí, en blanco y negro.",
      },
    ],
    activity: {
      kind: "decision",
      image: "/tm/patio.jpg",
      brief: "Revisa el expediente y escribe tu decisión final con su fundamento.",
      file: [
        { k: "Maniobras (re-evaluación)", v: "Enrrampe, acople y desacople: excelentes, de manual" },
        { k: "Primer acople (martes)", v: "Avanzó sin prueba de jalón ni verificación de mordaza" },
        { k: "Puntualidad", v: "Llegó 40 min tarde a su primera evaluación, sin avisar" },
        { k: "Entrevista", v: "Culpó a la unidad de cada observación; su historia del empleo anterior cambió dos veces" },
        { k: "Referencias", v: "Sin verificar: el número de su empleo anterior no contesta" },
        { k: "Rutas sin cubrir", v: "3 · costo diario estimado: $18,000" },
      ],
      prompt:
        "Escribe tu decisión sobre Ramón —lo que sea que decidas— y el fundamento con el que la vas a defender ante Marcela y, si hace falta, ante un juez.",
    },
    outro:
      "Entregas tu decisión firmada. Marcela la lee completa, la guarda en el expediente y extiende la mano: «Buena semana, instructor. Nos vemos el lunes».",
  },
];

export const INTRO = {
  company: "Transportes TM",
  logo: "/tm-logo.png",
  scene: "/tm/patio.jpg",
  title: "Una semana en TM",
  subtitle: "Siete días de trabajo real en la operación",
  paragraphs: [
    "Eres el instructor de operadores de Transportes TM. Tu semana empieza el lunes a las 06:45 y no será tranquila: hay ingresos que inducir, pruebas de manejo que dictaminar, una unidad por inspeccionar, un acompañamiento a ruta y una gerente con prisa.",
    "Trabaja como trabajas: revisa lo que revisas, escribe lo que escribes, decide lo que decides. La semana se guarda sola a medida que avanzas — si se va la señal, retomas donde te quedaste.",
    "Al final de la semana, la dirección cierra tu bitácora junto contigo.",
  ],
};

// ─────────────────────────────────────────────────────────────
// Resultados (solo visibles para administración)
// ─────────────────────────────────────────────────────────────

export interface AreaResult {
  area: AreaId;
  score: number;
  pct: number;
  level: "fortaleza" | "aceptable" | "reforzar";
}

export type Verdict = "APTO" | "APTO_CON_OBSERVACIONES" | "NO_APTO";

export const VERDICT_LABEL: Record<Verdict, string> = {
  APTO: "APTO",
  APTO_CON_OBSERVACIONES: "APTO CON OBSERVACIONES",
  NO_APTO: "NO APTO — REQUIERE REFORZAMIENTO",
};

export interface PlanItem {
  area: AreaId;
  pct: number;
  priority: "Alta" | "Media";
  actions: string[];
  durationWeeks: number;
}

export interface EvaluationResult {
  totalPct: number;
  verdict: Verdict;
  areas: AreaResult[];
  plan: PlanItem[];
  generalRecommendations: string[];
}

const PLAN_ACTIONS: Record<AreaId, string[]> = {
  IND: [
    "Co-diseñar y aplicar una evaluación diagnóstica de ingreso (teórica y práctica) antes de cada inducción.",
    "Acompañar 2 inducciones completas con un instructor senior usando lista de cotejo de contenidos mínimos.",
    "Construir perfiles de ingreso por tipo de operador (novato, empírico, veterano) y adaptar énfasis del curso a cada uno.",
  ],
  MAN: [
    "Adoptar checklist obligatorio de maniobras (prueba de jalón, mordaza, líneas, patas, referencias de enrrampe) con registro firmado.",
    "Aplicar criterio de falla crítica: cualquier omisión de seguridad anula la maniobra aunque el resto sea perfecto.",
    "Practicar 3 evaluaciones supervisadas de acople/desacople con retroalimentación de un instructor calibrador.",
  ],
  INS: [
    "Exigir inspección con formato y recorrido sistemático; prohibir liberaciones de inspecciones 'de memoria'.",
    "Estudiar el porqué de cada punto crítico (frenos, llantas, fugas, luces, quinta rueda) para poder enseñarlo, no solo revisarlo.",
    "Realizar 5 inspecciones sombra junto a operadores reales y comparar hallazgos contra el diagnóstico de taller.",
  ],
  DET: [
    "Capacitarse en observación conductual: registrar conductas observables con fecha, contexto y evidencia, no juicios.",
    "Aplicar una guía de señales de riesgo (cinturón, distracciones, reacción a la corrección, atajos) en cada acompañamiento.",
    "Practicar entrevistas por incidentes críticos para detectar inconsistencias y actitudes de riesgo.",
  ],
  REN: [
    "Aprender a cruzar telemetría, historial de mantenimiento, rendimiento por operador y condiciones de ruta antes de atribuir causas.",
    "Documentar cada diagnóstico de rendimiento con datos y causa raíz identificada antes de proponer acciones.",
    "Resolver 3 casos reales de bajo rendimiento con acompañamiento de mantenimiento y operaciones.",
  ],
  RET: [
    "Aplicar el protocolo de retroalimentación: en privado, específica por conducta y con plan de seguimiento fechado.",
    "Usar formato de observación en cada acompañamiento y comparar evolución del operador entre viajes.",
    "Practicar 2 conversaciones difíciles con un instructor senior y recibir retroalimentación sobre el método.",
  ],
  DEC: [
    "Integrar una matriz de decisión documentada: técnica, hábitos, actitud y evidencia por cada rubro.",
    "Manejar las tres salidas válidas (contratar / condicionar con plan y re-evaluación / no contratar) y sustentarlas con expediente.",
    "Revisar con un superior 3 decisiones recientes para calibrar criterio contra el estándar de la empresa.",
  ],
};

export function computeResult(
  scoreByArea: Partial<Record<AreaId, number>>
): EvaluationResult {
  const areas: AreaResult[] = AREAS.map((a) => {
    const score = scoreByArea[a.id] ?? 0;
    const pct = Math.round((score / 10) * 100);
    const level: AreaResult["level"] =
      pct >= 85 ? "fortaleza" : pct >= 70 ? "aceptable" : "reforzar";
    return { area: a.id, score, pct, level };
  });

  const totalPct = Math.round(
    areas.reduce((acc, a) => acc + a.pct, 0) / areas.length
  );

  const weakest = Math.min(...areas.map((a) => a.pct));
  const verdict: Verdict =
    totalPct >= 85 && weakest >= 70
      ? "APTO"
      : totalPct >= 65 && weakest >= 50
        ? "APTO_CON_OBSERVACIONES"
        : "NO_APTO";

  const plan: PlanItem[] = areas
    .filter((a) => a.pct < 70)
    .sort((a, b) => a.pct - b.pct)
    .map((a) => ({
      area: a.area,
      pct: a.pct,
      priority: a.pct < 50 ? "Alta" : "Media",
      actions: PLAN_ACTIONS[a.area],
      durationWeeks: a.pct < 50 ? 8 : 4,
    }));

  const generalRecommendations: string[] = [];
  if (verdict === "APTO") {
    generalRecommendations.push(
      "Mantener una re-evaluación anual para conservar la calibración del criterio.",
      "Considerar al instructor como calibrador de otros evaluadores en sus áreas de fortaleza."
    );
  } else if (verdict === "APTO_CON_OBSERVACIONES") {
    generalRecommendations.push(
      "Puede seguir operando con plan de refuerzo en las áreas señaladas y re-evaluación en 60-90 días.",
      "Un instructor senior debe supervisar sus evaluaciones en las áreas débiles hasta cerrar el plan."
    );
  } else {
    generalRecommendations.push(
      "No debe firmar evaluaciones de operadores de forma autónoma hasta completar el plan de reforzamiento.",
      "Re-evaluación completa obligatoria al concluir el plan (máximo 90 días).",
      "Mientras tanto, sus evaluaciones requieren co-firma de un instructor calificado."
    );
  }
  if (plan.some((p) => p.priority === "Alta")) {
    generalRecommendations.push(
      "Existen áreas críticas (menos del 50%): atenderlas primero por su impacto directo en seguridad y utilidad."
    );
  }

  return { totalPct, verdict, areas, plan, generalRecommendations };
}

// Compatibilidad con backend: capítulos como "escenarios"
export interface ScenarioLike {
  id: string;
  area: AreaId;
  title: string;
}

export const MODULES: { id: string; scenario: ScenarioLike }[] = CHAPTERS.map(
  (c) => ({ id: c.id, scenario: { id: c.id, area: c.area, title: c.title } })
);

export function getScenarioById(id: string): ScenarioLike | undefined {
  return MODULES.map((m) => m.scenario).find((s) => s.id === id);
}

export const TOTAL_MODULES = CHAPTERS.length;

// ─────────────────────────────────────────────────────────────
// Variantes de escenarios (banco rotativo). La variante se
// asigna en el servidor al crear la sesión y rota por intento,
// para que los escenarios no circulen entre cohortes. Aquí solo
// vive el contenido visible; la verdad plantada de cada
// variante (qué puntos tienen defecto, qué momentos ameritan
// intervención) está en api/scoring.ts, solo servidor.
// ─────────────────────────────────────────────────────────────

export type VariantId = "A" | "B" | "C";
export const VARIANTS: VariantId[] = ["A", "B", "C"];

interface VariantContent {
  inspectionSeen?: Record<string, string>;
  rideMoments?: RideMoment[];
}

export const VARIANT_CONTENT: Record<VariantId, VariantContent> = {
  A: {},
  B: {
    inspectionSeen: {
      h1: "Presión correcta y labrado parejo, pero hay una cortada profunda en el costado: se alcanza a ver la cuerda.",
      h2: "Nivel de aceite en rango. Grasa vieja y fría en la manguera de dirección, sin fuga activa; la etiqueta del próximo servicio vence esta semana.",
      h3: "Escalón inferior firme, pasamanos sin juego. En el piso de cabina, papeles y una botella suelta.",
      h4: "Doble rodada con presión pareja en las cuatro; tuercas con marca de torque alineadas.",
      h5: "Tanque sin golpes, pero el tapón gotea: charco de diésel fresco bajo el tanque y olor fuerte a combustible.",
      h6: "Mordaza cerrada sobre el perno rey, manija en su seguro y plato con grasa pareja.",
      h7: "Las cinco plumas frontales encienden parejas, sin focos muertos.",
      h8: "La lona trae un desgarre reciente de un palmo y el sello de la carga aparece cortado, colgando de un solo tramo.",
      h9: "Siete llantas con presión pareja; la exterior trasera derecha está visiblemente baja: 25 psi abajo.",
      h10: "Puertas cierran parejas, chapa sin juego. Al pisar el freno, la pluma izquierda no enciende: foco de freno muerto.",
      h11: "Defensa trasera floja: le faltan dos tornillos y se mueve con la mano. Las luces de placa no encienden.",
      h12: "Espejos firmes, cristal sin estrellas.",
    },
    rideMoments: [
      { id: "m1", time: "06:05", text: "Pedro se abrocha el cinturón antes de arrancar, ajusta espejos y sale del andén despacio." },
      { id: "m2", time: "06:20", text: "En la incorporación a la carretera se mete brusco entre dos unidades, sin direccional. El camión de atrás pega un frenón y le toca el claxon." },
      { id: "m3", time: "06:45", text: "Suena su celular. Lo deja en la guantera sin tocarlo: «luego veo», dice, y sigue con la vista al frente." },
      { id: "m4", time: "07:10", text: "Zona de curvas amplias. Pedro entra rápido y tiene que frenar ya dentro de la curva; la unidad se ladea y algo se mueve en la caja de herramientas." },
      { id: "m5", time: "07:40", text: "En la caseta, con la fila detenida, pone el freno de estacionamiento y mantiene la unidad asegurada mientras espera su turno." },
      { id: "m6", time: "08:05", text: "Rebase a un torton en tramo de visibilidad corta: se cruza la raya continua y al regresar cierra al torton, que tiene que frenar." },
      { id: "m7", time: "08:30", text: "En la recta larga antes de Matehuala mantiene ambas manos al volante y velocidad constante de crucero." },
      { id: "m8", time: "08:50", text: "Llega al cliente sin avisar por radio, improvisa la maniobra de enrrampe y roza el muelle con la defensa trasera." },
    ],
  },
  C: {
    inspectionSeen: {
      h1: "Presión correcta y sin cortadas; desgaste irregular leve en el hombro exterior, para vigilar en el próximo servicio.",
      h2: "El depósito de la dirección hidráulica está bajo y una manguera gotea de forma constante: se está formando un charquito fresco.",
      h3: "Escalón inferior firme, pasamanos sin juego. En el piso de cabina, papeles y una botella suelta.",
      h4: "Doble rodada con presión pareja… excepto la interior trasera: 18 psi abajo y el labrado se ve más hundido.",
      h5: "Tanque sin golpes, tapón con sello; bajos secos y sin rastros de fuga.",
      h6: "Mordaza cerrada sobre el perno rey, pero la manija va sin su seguro: al tacto tiene juego.",
      h7: "Ninguna de las cinco plumas superiores enciende: el arnés cuelga suelto detrás de la caja.",
      h8: "Lona sin raspaduras nuevas, puertas con bisagras firmes y sello de la carga íntegro.",
      h9: "Presión pareja en las ocho llantas, pero a la tornamesa le falta uno de sus seguros.",
      h10: "Puertas cierran parejas, chapa sin juego; direccionales y luces de freno encienden correctas.",
      h11: "Defensa firme, placa legible, luces de placa funcionando.",
      h12: "Espejos firmes, pero el cristal trae una estrella grande en la esquina inferior derecha, justo en la línea de visión.",
    },
    rideMoments: [
      { id: "m1", time: "06:05", text: "Pedro se abrocha el cinturón antes de arrancar, ajusta espejos y sale del andén con calma." },
      { id: "m2", time: "06:20", text: "En la incorporación a la carretera no cede el paso: se incorpora cerrando a una unidad que venía por el carril principal." },
      { id: "m3", time: "06:45", text: "Suena su celular: contesta una videollamada y la sostiene varios segundos, con la vista bajando a la pantalla, antes de colgar." },
      { id: "m4", time: "07:10", text: "Zona de curvas amplias. Pedro ajusta la velocidad antes de entrar, sale limpio de cada una y comenta: «aquí siempre hay patrulla»." },
      { id: "m5", time: "07:40", text: "En la caseta baja a estirar las piernas y deja la unidad con el motor encendido, en neutral y sin freno de estacionamiento." },
      { id: "m6", time: "08:05", text: "Rebase a un torton: pone direccional, espera visibilidad completa, pasa firme y regresa a su carril dejando buen margen." },
      { id: "m7", time: "08:30", text: "En la recta larga antes de Matehuala lleva la aguja 15 km/h arriba del límite: «el cliente tiene prisa», justifica." },
      { id: "m8", time: "08:50", text: "A 2 km del destino reduce la velocidad, avisa por radio su llegada al cliente y repasa en voz alta el plan de maniobra para el enrrampe." },
    ],
  },
};

export function getChapterForVariant(
  chapter: Chapter,
  variant: VariantId | string | null | undefined
): Chapter {
  const vc = VARIANT_CONTENT[(variant as VariantId) || "A"];
  if (!vc) return chapter;
  if (chapter.activity.kind === "inspection" && vc.inspectionSeen) {
    const seen = vc.inspectionSeen;
    return {
      ...chapter,
      activity: {
        ...chapter.activity,
        hotspots: chapter.activity.hotspots.map((h) => ({
          ...h,
          seen: seen[h.id] ?? h.seen,
        })),
      },
    };
  }
  if (chapter.activity.kind === "ridealong" && vc.rideMoments) {
    return {
      ...chapter,
      activity: { ...chapter.activity, moments: vc.rideMoments },
    };
  }
  return chapter;
}

// ── Mensaje de bienvenida de la dirección ─────────────────────

export const DIRECTOR_MESSAGE = {
  from: "Dirección General · Transportes TM",
  quote:
    "En TM creemos que la seguridad empieza con quien enseña. Esta semana no es un examen: es tu trabajo, como tú lo haces todos los días. De tu criterio dependen los operadores que salen a la carretera y las familias que los esperan en casa. Bienvenido.",
};

// ─────────────────────────────────────────────────────────────
// Resumen para el participante (cierre de semana). Se muestra
// SIN puntajes ni veredictos: fortalezas y áreas de crecimiento
// con redacción constructiva.
// ─────────────────────────────────────────────────────────────

export const AREA_PHRASES: Record<AreaId, { strength: string; growth: string }> = {
  IND: {
    strength: "Diseñas inducciones que parten del diagnóstico de cada operador y comprueban el aprendizaje antes de soltar a la gente a operar.",
    growth: "Vale la pena estructurar mejor tus inducciones: conocer el punto de partida de cada ingreso y verificar que realmente entendieron antes de liberarlos.",
  },
  MAN: {
    strength: "Evalúas maniobras con rigor: no firmas sin que el procedimiento de seguridad esté completo, aunque el resto de la prueba sea perfecto.",
    growth: "En las evaluaciones de maniobras, haz innegociable el procedimiento de seguridad completo —prueba de jalón y verificación de mordaza— antes de firmar cualquier dictamen.",
  },
  INS: {
    strength: "Inspeccionas con método y recorrido completo; detectas lo que pone en riesgo la unidad y lo documentas antes de liberarla.",
    growth: "Sistematiza tu inspección: recorrido completo, punto por punto, y reporte que distinga lo crítico de lo menor antes de liberar una unidad.",
  },
  DET: {
    strength: "Detectas las conductas de riesgo en el momento y sabes distinguir cuándo intervenir y cuándo reconocer la buena conducción.",
    growth: "Afina tu observación en ruta: intervenir en cada conducta de riesgo en el momento —y reconocer, no corregir, la buena conducción— es el corazón del acompañamiento.",
  },
  REN: {
    strength: "Diagnosticas con datos: cruzas telemetría, historial y bitácora antes de atribuir causas, y evitas decisiones injustas contra los operadores.",
    growth: "Antes de atribuir un mal rendimiento a una persona, cruza los datos: telemetría, historial de la unidad y bitácora de mantenimiento. La evidencia primero.",
  },
  RET: {
    strength: "Retroalimentas con hechos concretos, reconociendo también lo bien hecho, y cierras con acuerdos de seguimiento.",
    growth: "Haz tu retroalimentación más específica: conductas observadas con fecha y contexto, reconocer lo bien hecho y cerrar con un acuerdo de seguimiento concreto.",
  },
  DEC: {
    strength: "Decides con expediente: pesas la seguridad y la actitud por encima de la presión operativa y sustentas lo que firmas.",
    growth: "Fortalece tu criterio de decisión: la técnica no compensa una actitud de riesgo documentada, y toda decisión debe poder defenderse con el expediente en la mano.",
  },
};

export interface ParticipantSummaryItem {
  area: AreaId;
  name: string;
  text: string;
}

export function buildParticipantSummary(result: EvaluationResult): {
  strengths: ParticipantSummaryItem[];
  growth: ParticipantSummaryItem[];
} {
  const byId = (a: AreaId) => AREAS.find((x) => x.id === a)!;
  let strengths = result.areas
    .filter((a) => a.level === "fortaleza")
    .map((a) => ({ area: a.area, name: byId(a.area).name, text: AREA_PHRASES[a.area].strength }));
  if (strengths.length === 0) {
    // Si no hay fortalezas formales, destacar lo más sólido de la semana.
    const top = [...result.areas].sort((a, b) => b.pct - a.pct)[0];
    if (top && top.pct > 0) {
      strengths = [{ area: top.area, name: byId(top.area).name, text: AREA_PHRASES[top.area].strength }];
    }
  }
  const growth = result.areas
    .filter((a) => a.level === "reforzar")
    .map((a) => ({ area: a.area, name: byId(a.area).name, text: AREA_PHRASES[a.area].growth }));
  return { strengths, growth };
}

// ── Material de refuerzo por área (para la re-simulación) ────

export const REINFORCEMENT: Record<AreaId, { title: string; points: string[] }> = {
  IND: {
    title: "Inducción que sí forma",
    points: [
      "Antes de enseñar, diagnostica: entrevista breve y demostración práctica para conocer el punto de partida de cada ingreso.",
      "Diferencia: al veterano se le valida y actualiza; al novato se le forma desde cero. Mismo día, caminos distintos.",
      "Cierra siempre con verificación: examen corto o demostración práctica. Nadie sale de la sala sin comprobar que entendió.",
    ],
  },
  MAN: {
    title: "Dictaminar maniobras sin atajos",
    points: [
      "El clic del enganche no garantiza el acople: la prueba de jalón y la verificación visual de la mordaza son obligatorias, siempre.",
      "Una omisión de seguridad anula la maniobra aunque todo lo demás sea perfecto. Ese es el criterio de falla crítica.",
      "La hora, la prisa o la simpatía nunca firman por ti: solo lo observado.",
    ],
  },
  INS: {
    title: "Inspección sistemática",
    points: [
      "Recorrido fijo, punto por punto, sin excepción: las inspecciones «de memoria» son las que liberan unidades con fallas.",
      "Distingue lo crítico (seguridad: llantas, fugas, luces, frenos, quinta rueda) de lo menor, y actúa en consecuencia.",
      "Una unidad con falla crítica no sale: el reporte debe decir qué se repara antes de liberarla.",
    ],
  },
  DET: {
    title: "Ver lo que importa en ruta",
    points: [
      "Toda conducta de riesgo se corrige en el momento: cinturón, distracciones, unidad asegurada al detenerse, ambas manos al volante.",
      "Corregir lo correcto también daña: reconocer la buena conducción da credibilidad para corregir la mala.",
      "Registra conductas observables con hora y contexto, no juicios sobre la persona.",
    ],
  },
  REN: {
    title: "Diagnosticar con datos",
    points: [
      "Regla de oro: si la unidad rinde mal con varios operadores distintos, el problema viaja con la unidad.",
      "Cruza siempre: telemetría del operador, historial de la unidad, bitácora de mantenimiento y condiciones de ruta.",
      "Un curso correctivo a quien no lo merece es injusto y no resuelve nada: primero la causa raíz, luego la acción.",
    ],
  },
  RET: {
    title: "Conversaciones difíciles",
    points: [
      "En privado, con hechos: conductas concretas observadas, con fecha y contexto. Nunca sobre el carácter de la persona.",
      "Reconoce primero lo bien hecho: con un veterano, tu credibilidad depende de ser justo en ambas direcciones.",
      "Cierra con acuerdo: qué cambiará, cómo se verá y cuándo se revisa.",
    ],
  },
  DEC: {
    title: "Decidir con expediente",
    points: [
      "La técnica no compensa la actitud: omisiones de seguridad, impuntualidad y evasión de responsabilidad pesan más que una maniobra perfecta.",
      "Las tres salidas válidas: contratar, condicionar con plan verificable, o no contratar. Las tres se sustentan con expediente.",
      "La presión operativa (rutas sin cubrir) no es un argumento de seguridad. Lo que firmas lo defiendes tú.",
    ],
  },
};

// Re-evaluación periódica: sesiones cerradas con más de estos
// días se marcan en el panel como "requiere re-evaluación".
export const REEVALUATION_DAYS = 180;
