import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { trpc } from "@/providers/trpc";
import {
  CHAPTERS,
  INTRO,
  SPEAKER_META,
  getChapterForVariant,
  type Chapter,
  type DecisionActivity,
  type FreeTextActivity,
  type InspectionActivity,
  type RideAlongActivity,
  type TelemetryActivity,
} from "@contracts/course";

type Phase = "intro" | "chapter" | "activity" | "outro" | "end";

// ── Efecto máquina de escribir ────────────────────────────────
function useTypewriter(text: string, active: boolean, speed = 18) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    setShown(0);
    if (!active) return;
    const t = setInterval(() => {
      setShown((s) => {
        if (s >= text.length) {
          clearInterval(t);
          return s;
        }
        return s + 1;
      });
    }, speed);
    return () => clearInterval(t);
  }, [text, active, speed]);
  return {
    text: text.slice(0, shown),
    done: shown >= text.length,
    skip: () => setShown(text.length),
  };
}

// ── Diálogo con personajes ────────────────────────────────────
function DialogueScene({
  chapter,
  onDone,
}: {
  chapter: Chapter;
  onDone: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const d = chapter.intro[idx];
  const meta = SPEAKER_META[d.speaker];
  const tw = useTypewriter(d.text, true);

  const advance = () => {
    if (!tw.done) {
      tw.skip();
      return;
    }
    if (idx < chapter.intro.length - 1) setIdx((i) => i + 1);
    else onDone();
  };

  return (
    <button
      onClick={advance}
      className="absolute inset-0 z-20 flex cursor-pointer flex-col justify-end text-left"
    >
      {/* Personaje */}
      {meta.img && (
        <img
          key={`${chapter.id}-${idx}`}
          src={meta.img}
          alt={meta.name}
          className={`char-in pointer-events-none absolute bottom-24 max-h-[62vh] w-auto max-w-[42vw] object-contain drop-shadow-[0_18px_30px_rgba(0,0,0,0.6)] sm:bottom-20 ${
            meta.side === "right"
              ? "right-2 sm:right-10"
              : "left-2 sm:left-10"
          }`}
        />
      )}
      {/* Burbuja */}
      <div className="relative z-30 mx-auto w-full max-w-3xl px-4 pb-6 sm:pb-10">
        <div className="border border-white/15 bg-black/70 p-5 backdrop-blur-md sm:p-6">
          {meta.name && (
            <p className="font-code text-[11px] font-bold uppercase tracking-[0.25em] text-[#ff8a50]">
              {meta.name}
              <span className="ml-2 font-normal normal-case tracking-normal text-white/40">
                {meta.role}
              </span>
            </p>
          )}
          <p className="mt-2 min-h-[3.5rem] text-base leading-relaxed text-white sm:text-lg">
            {tw.text}
            {!tw.done && <span className="animate-pulse text-[#ff8a50]">▌</span>}
          </p>
          <p className="mt-3 text-right font-code text-[11px] uppercase tracking-widest text-white/40">
            {tw.done
              ? idx < chapter.intro.length - 1
                ? "Toca para continuar ▸"
                : "Manos a la obra ▸"
              : "Toca para saltar"}
          </p>
        </div>
      </div>
    </button>
  );
}

// ── Actividad: texto libre ────────────────────────────────────
function FreeTextView({
  activity,
  busy,
  onSubmit,
}: {
  activity: FreeTextActivity;
  busy: boolean;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  const [text, setText] = useState("");
  const ok = text.trim().length >= activity.minChars;
  return (
    <div className="step-in mx-auto w-full max-w-3xl px-4 pb-10">
      <div className="border border-white/15 bg-black/70 p-5 backdrop-blur-md sm:p-7">
        <p className="font-code text-[11px] uppercase tracking-[0.3em] text-[#ff8a50]">
          Tu turno
        </p>
        <p className="mt-3 text-base leading-relaxed text-white sm:text-lg">
          {activity.prompt}
        </p>
        <p className="mt-2 text-sm italic text-white/45">{activity.hint}</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="Escribe aquí…"
          className="mt-5 w-full resize-y border border-white/20 bg-white/5 p-4 text-base leading-relaxed text-white placeholder:text-white/25 focus:border-[#ff6026] focus:outline-none"
        />
        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="font-code text-[11px] text-white/40">
            {text.trim().length} / {activity.minChars} caracteres mínimo
          </p>
          <button
            disabled={!ok || busy}
            onClick={() => onSubmit({ text: text.trim() })}
            className="bg-[#ff6026] px-8 py-3 font-display text-sm font-bold uppercase tracking-widest text-white transition hover:bg-[#e04e1a] disabled:cursor-not-allowed disabled:opacity-30"
          >
            {busy ? "Guardando…" : "Listo ▸"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Actividad: decisión con expediente ────────────────────────
function DecisionView({
  activity,
  busy,
  onSubmit,
}: {
  activity: DecisionActivity;
  busy: boolean;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  const [verdict, setVerdict] = useState("");
  const [justification, setJustification] = useState("");
  const ok = verdict.trim().length >= 8 && justification.trim().length >= 60;
  return (
    <div className="step-in mx-auto w-full max-w-3xl px-4 pb-10">
      <div className="border border-white/15 bg-black/70 p-5 backdrop-blur-md sm:p-7">
        <p className="font-code text-[11px] uppercase tracking-[0.3em] text-[#ff8a50]">
          {activity.brief}
        </p>
        <div className="mt-4 divide-y divide-white/10 border border-white/15">
          {activity.file.map((row) => (
            <div key={row.k} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[220px_1fr]">
              <p className="font-code text-[11px] uppercase tracking-wider text-white/45">
                {row.k}
              </p>
              <p className="text-sm leading-relaxed text-white/85">{row.v}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-base leading-relaxed text-white sm:text-lg">
          {activity.prompt}
        </p>
        <input
          value={verdict}
          onChange={(e) => setVerdict(e.target.value)}
          placeholder="Tu dictamen en una línea (ej. «Aprueba», «No aprueba», «Aprueba condicionado a…»)"
          className="mt-4 w-full border border-white/20 bg-white/5 p-3.5 text-base text-white placeholder:text-white/25 focus:border-[#ff6026] focus:outline-none"
        />
        <textarea
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          rows={6}
          placeholder="Tu fundamento: qué observaste y por qué decides eso…"
          className="mt-3 w-full resize-y border border-white/20 bg-white/5 p-4 text-base leading-relaxed text-white placeholder:text-white/25 focus:border-[#ff6026] focus:outline-none"
        />
        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="font-code text-[11px] text-white/40">
            Fundamento: {justification.trim().length} / 60 caracteres mínimo
          </p>
          <button
            disabled={!ok || busy}
            onClick={() =>
              onSubmit({
                verdict: verdict.trim(),
                justification: justification.trim(),
              })
            }
            className="bg-[#ff6026] px-8 py-3 font-display text-sm font-bold uppercase tracking-widest text-white transition hover:bg-[#e04e1a] disabled:cursor-not-allowed disabled:opacity-30"
          >
            {busy ? "Firmando…" : "Firmar dictamen ▸"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Actividad: inspección con hotspots ────────────────────────
function InspectionView({
  activity,
  busy,
  onSubmit,
}: {
  activity: InspectionActivity;
  busy: boolean;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  const [tapped, setTapped] = useState<string[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [report, setReport] = useState("");
  const ok = report.trim().length >= 80;

  const tap = (id: string) => {
    setCurrent(id);
    setTapped((t) => (t.includes(id) ? t : [...t, id]));
  };
  const currentSpot = activity.hotspots.find((h) => h.id === current);

  if (writing) {
    return (
      <div className="step-in mx-auto w-full max-w-3xl px-4 pb-10">
        <div className="border border-white/15 bg-black/70 p-5 backdrop-blur-md sm:p-7">
          <p className="font-code text-[11px] uppercase tracking-[0.3em] text-[#ff8a50]">
            Tu reporte · revisaste {tapped.length} de {activity.hotspots.length} puntos
          </p>
          <p className="mt-3 text-base leading-relaxed text-white sm:text-lg">
            {activity.reportPrompt}
          </p>
          <textarea
            value={report}
            onChange={(e) => setReport(e.target.value)}
            rows={8}
            placeholder="Escribe tu reporte…"
            className="mt-5 w-full resize-y border border-white/20 bg-white/5 p-4 text-base leading-relaxed text-white placeholder:text-white/25 focus:border-[#ff6026] focus:outline-none"
          />
          <div className="mt-4 flex items-center justify-between gap-4">
            <button
              onClick={() => setWriting(false)}
              className="font-code text-xs uppercase tracking-widest text-white/50 underline-offset-4 hover:text-white hover:underline"
            >
              ◂ Seguir revisando
            </button>
            <button
              disabled={!ok || busy}
              onClick={() => onSubmit({ tapped, report: report.trim() })}
              className="bg-[#ff6026] px-8 py-3 font-display text-sm font-bold uppercase tracking-widest text-white transition hover:bg-[#e04e1a] disabled:cursor-not-allowed disabled:opacity-30"
            >
              {busy ? "Entregando…" : "Entregar reporte ▸"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="step-in mx-auto w-full max-w-5xl px-4 pb-10">
      <p className="mb-3 text-center text-sm text-white/70">
        {activity.brief}{" "}
        <span className="font-code text-xs text-[#ff8a50]">
          {tapped.length}/{activity.hotspots.length} puntos revisados
        </span>
      </p>
      <div className="relative mx-auto border border-white/15 bg-black/40">
        <img
          src={activity.image}
          alt="Unidad TM 312"
          className="w-full select-none"
          draggable={false}
        />
        {activity.hotspots.map((h) => {
          const done = tapped.includes(h.id);
          return (
            <button
              key={h.id}
              onClick={() => tap(h.id)}
              style={{ left: `${h.x}%`, top: `${h.y}%` }}
              title={h.label}
              className={`absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 font-code text-xs font-bold transition sm:h-11 sm:w-11 ${
                done
                  ? "border-emerald-400 bg-emerald-400/30 text-emerald-200"
                  : "border-[#ff6026] bg-[#ff6026]/25 text-white animate-pulse hover:bg-[#ff6026]/50"
              }`}
            >
              {done ? "✓" : "?"}
            </button>
          );
        })}
      </div>

      <div className="mx-auto mt-4 grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="min-h-[96px] border border-white/15 bg-black/70 p-4 backdrop-blur-md">
          {currentSpot ? (
            <>
              <p className="font-code text-[11px] uppercase tracking-widest text-[#ff8a50]">
                {currentSpot.label}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/90 sm:text-base">
                {currentSpot.seen}
              </p>
            </>
          ) : (
            <p className="text-sm italic text-white/40">
              Toca los puntos naranjas de la unidad para revisarlos. Revisa con
              el mismo orden y cuidado con el que lo harías en el andén.
            </p>
          )}
        </div>
        <button
          onClick={() => setWriting(true)}
          disabled={tapped.length === 0}
          className="border border-[#ff6026] bg-[#ff6026]/15 px-6 py-4 font-display text-sm font-bold uppercase tracking-widest text-[#ff8a50] transition hover:bg-[#ff6026]/30 disabled:opacity-30"
        >
          Terminar y escribir reporte ▸
        </button>
      </div>
    </div>
  );
}

// ── Actividad: acompañamiento (intervenir / seguir) ───────────
function RideAlongView({
  activity,
  busy,
  onSubmit,
}: {
  activity: RideAlongActivity;
  busy: boolean;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [actions, setActions] = useState<{ momentId: string; action: string }[]>([]);
  const moment = activity.moments[idx];
  const tw = useTypewriter(moment.text, true, 14);
  const last = idx === activity.moments.length - 1;

  const act = (action: "intervenir" | "seguir") => {
    const next = [...actions, { momentId: moment.id, action }];
    setActions(next);
    if (last) {
      onSubmit({ actions: next });
    } else {
      setIdx((i) => i + 1);
    }
  };

  return (
    <div className="step-in mx-auto w-full max-w-3xl px-4 pb-10">
      <div className="mb-3 flex items-center justify-between font-code text-xs uppercase tracking-widest text-white/50">
        <span>{activity.brief}</span>
        <span className="text-[#ff8a50]">
          Momento {idx + 1} / {activity.moments.length}
        </span>
      </div>
      <div className="h-1 w-full bg-white/10">
        <div
          className="h-full bg-[#ff6026] transition-all"
          style={{ width: `${((idx + 1) / activity.moments.length) * 100}%` }}
        />
      </div>

      <div className="mt-4 border border-white/15 bg-black/70 p-5 backdrop-blur-md sm:p-7">
        <p className="font-code text-sm font-bold uppercase tracking-[0.3em] text-[#ff8a50]">
          {moment.time} h
        </p>
        <p className="mt-3 min-h-[5.5rem] text-base leading-relaxed text-white sm:text-lg">
          {tw.text}
          {!tw.done && <span className="animate-pulse text-[#ff8a50]">▌</span>}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            disabled={!tw.done || busy}
            onClick={() => act("intervenir")}
            className="border-2 border-[#ff6026] bg-[#ff6026]/20 px-4 py-4 font-display text-sm font-bold uppercase tracking-widest text-white transition hover:bg-[#ff6026]/40 disabled:opacity-30"
          >
            ⚑ Intervenir
          </button>
          <button
            disabled={!tw.done || busy}
            onClick={() => act("seguir")}
            className="border border-white/25 bg-white/5 px-4 py-4 font-display text-sm font-bold uppercase tracking-widest text-white/80 transition hover:bg-white/15 disabled:opacity-30"
          >
            Todo bien · seguir ▸
          </button>
        </div>
        {busy && (
          <p className="mt-3 text-center font-code text-xs text-white/40">
            Cerrando bitácora del viaje…
          </p>
        )}
      </div>
    </div>
  );
}

// ── Actividad: telemetría / datos ─────────────────────────────
function TelemetryView({
  activity,
  busy,
  onSubmit,
}: {
  activity: TelemetryActivity;
  busy: boolean;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  const [opened, setOpened] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [diagnosis, setDiagnosis] = useState("");
  const ok = diagnosis.trim().length >= 80;

  const open = (id: string) => {
    setActive(id);
    setOpened((o) => (o.includes(id) ? o : [...o, id]));
  };
  const tab = activity.tabs.find((t) => t.id === active);

  if (writing) {
    return (
      <div className="step-in mx-auto w-full max-w-3xl px-4 pb-10">
        <div className="border border-white/15 bg-black/70 p-5 backdrop-blur-md sm:p-7">
          <p className="font-code text-[11px] uppercase tracking-[0.3em] text-[#ff8a50]">
            Tu conclusión · consultaste {opened.length} de {activity.tabs.length} fuentes
          </p>
          <p className="mt-3 text-base leading-relaxed text-white sm:text-lg">
            {activity.prompt}
          </p>
          <textarea
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            rows={8}
            placeholder="Escribe tu conclusión…"
            className="mt-5 w-full resize-y border border-white/20 bg-white/5 p-4 text-base leading-relaxed text-white placeholder:text-white/25 focus:border-[#ff6026] focus:outline-none"
          />
          <div className="mt-4 flex items-center justify-between gap-4">
            <button
              onClick={() => setWriting(false)}
              className="font-code text-xs uppercase tracking-widest text-white/50 underline-offset-4 hover:text-white hover:underline"
            >
              ◂ Revisar más datos
            </button>
            <button
              disabled={!ok || busy}
              onClick={() => onSubmit({ tabsOpened: opened, diagnosis: diagnosis.trim() })}
              className="bg-[#ff6026] px-8 py-3 font-display text-sm font-bold uppercase tracking-widest text-white transition hover:bg-[#e04e1a] disabled:cursor-not-allowed disabled:opacity-30"
            >
              {busy ? "Enviando…" : "Darle mi conclusión a Marcela ▸"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="step-in mx-auto w-full max-w-3xl px-4 pb-10">
      <p className="mb-3 text-center text-sm text-white/70">{activity.brief}</p>
      <div className="border border-white/15 bg-black/70 backdrop-blur-md">
        <div className="flex flex-wrap border-b border-white/15">
          {activity.tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => open(t.id)}
              className={`px-4 py-3 font-code text-xs uppercase tracking-wider transition ${
                active === t.id
                  ? "bg-[#ff6026] text-white"
                  : opened.includes(t.id)
                    ? "text-emerald-300 hover:bg-white/10"
                    : "text-white/60 hover:bg-white/10"
              }`}
            >
              {opened.includes(t.id) && active !== t.id ? "✓ " : ""}
              {t.title}
            </button>
          ))}
        </div>
        <div className="min-h-[220px] p-5">
          {tab ? (
            <div className="divide-y divide-white/10">
              {tab.rows.map((r) => (
                <div key={r.k} className="grid gap-1 py-2.5 sm:grid-cols-[240px_1fr]">
                  <p className="font-code text-[11px] uppercase tracking-wider text-white/45">
                    {r.k}
                  </p>
                  <p className="text-sm text-white/90">{r.v}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm italic text-white/40">
              Abre las fuentes de datos que necesites. Investiga como lo harías
              en tu escritorio: lo que no revises, no existe.
            </p>
          )}
        </div>
        <div className="border-t border-white/15 p-4 text-right">
          <button
            onClick={() => setWriting(true)}
            disabled={opened.length === 0}
            className="border border-[#ff6026] bg-[#ff6026]/15 px-6 py-3 font-display text-sm font-bold uppercase tracking-widest text-[#ff8a50] transition hover:bg-[#ff6026]/30 disabled:opacity-30"
          >
            Ya tengo una conclusión ▸
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Cierre de capítulo (narrativo, sin puntajes) ──────────────
function OutroView({
  text,
  last,
  busy,
  onNext,
}: {
  text: string;
  last: boolean;
  busy: boolean;
  onNext: () => void;
}) {
  const tw = useTypewriter(text, true);
  return (
    <div className="step-in mx-auto w-full max-w-3xl px-4 pb-10">
      <button
        onClick={() => {
          if (!tw.done) {
            tw.skip();
            return;
          }
          if (!busy) onNext();
        }}
        className="w-full cursor-pointer border border-white/15 bg-black/70 p-5 text-left backdrop-blur-md sm:p-7"
      >
        <p className="min-h-[4rem] text-base leading-relaxed text-white/90 sm:text-lg">
          {tw.text}
          {!tw.done && <span className="animate-pulse text-[#ff8a50]">▌</span>}
        </p>
        <p className="mt-4 text-right font-code text-[11px] uppercase tracking-widest text-white/40">
          {busy
            ? "Guardando tu día…"
            : tw.done
              ? last
                ? "Cerrar la semana ▸"
                : "Siguiente día ▸"
              : "Toca para saltar"}
        </p>
      </button>
    </div>
  );
}

// ── Portada de la semana ──────────────────────────────────────
function WeekIntro({ participant, onStart }: { participant: string; onStart: () => void }) {
  return (
    <div className="step-in mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 pb-16">
      <img src={INTRO.logo} alt="TM" className="h-16 w-16 object-cover" />
      <p className="mt-6 font-code text-xs uppercase tracking-[0.35em] text-[#ff8a50]">
        {INTRO.company} · {INTRO.subtitle}
      </p>
      <h1 className="mt-3 font-display text-5xl font-bold uppercase leading-none text-white sm:text-6xl">
        {INTRO.title}
      </h1>
      <p className="mt-4 font-code text-sm uppercase tracking-widest text-white/50">
        Instructor de guardia: <span className="text-white">{participant}</span>
      </p>
      <div className="mt-8 space-y-4">
        {INTRO.paragraphs.map((p, i) => (
          <p key={i} className="max-w-2xl text-base leading-relaxed text-white/75">
            {p}
          </p>
        ))}
      </div>
      <button
        onClick={onStart}
        className="mt-10 w-fit bg-[#ff6026] px-10 py-4 font-display text-base font-bold uppercase tracking-widest text-white transition hover:bg-[#e04e1a]"
      >
        Lunes 06:45 · Entrar a patio ▸
      </button>
    </div>
  );
}

// ── Pantalla principal ────────────────────────────────────────
export default function Course() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const id = Number(sessionId);
  const navigate = useNavigate();

  const sessionQ = trpc.eval.session.useQuery(
    { sessionId: id },
    { enabled: Number.isFinite(id), retry: false }
  );

  const [chapterIdx, setChapterIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("intro");
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = trpc.eval.submit.useMutation();
  const complete = trpc.eval.complete.useMutation({
    onSuccess: () => navigate(`/resultado/${id}`),
    onError: () => setSaving(false),
  });

  useEffect(() => {
    const data = sessionQ.data;
    if (!data || initialized) return;
    if (data.session.status === "completed") {
      navigate(`/resultado/${id}`, { replace: true });
      return;
    }
    const done = new Set(data.answers.map((a) => a.scenarioId));
    const pending = CHAPTERS.findIndex((c) => !done.has(c.id));
    if (pending === -1) {
      setPhase("end");
    } else if (done.size > 0) {
      setChapterIdx(pending);
      setPhase("chapter");
    }
    setInitialized(true);
  }, [sessionQ.data, initialized, id, navigate]);

  // Precarga de escenas
  useEffect(() => {
    [INTRO.scene, ...CHAPTERS.map((c) => c.scene)].forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [phase, chapterIdx]);

  if (!Number.isFinite(id) || sessionQ.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0d16] px-6 text-center">
        <p className="text-white/60">Sesión no válida.</p>
      </div>
    );
  }
  if (!sessionQ.data || !initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0d16]">
        <p className="font-code text-sm text-white/50">Cargando…</p>
      </div>
    );
  }

  const { participant, session } = sessionQ.data;
  // La variante de la sesión define qué versión de los escenarios
  // (inspección y acompañamiento) ve este participante.
  const chapter = getChapterForVariant(CHAPTERS[chapterIdx], session.variant);
  const last = chapterIdx === CHAPTERS.length - 1;

  const scene =
    phase === "intro" ? INTRO.scene : (chapter?.scene ?? INTRO.scene);

  const handleSubmit = (payload: Record<string, unknown>) => {
    setSaving(true);
    submit.mutate(
      { sessionId: id, scenarioId: chapter.id, payload },
      {
        onSuccess: () => {
          setSaving(false);
          setPhase("outro");
        },
        onError: () => {
          setSaving(false);
          // Reintento silencioso: no frenamos la semana por un parpadeo de red.
          alert("No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.");
        },
      }
    );
  };

  const next = () => {
    if (last) {
      setSaving(true);
      complete.mutate({ sessionId: id });
    } else {
      setChapterIdx((i) => i + 1);
      setPhase("chapter");
    }
  };

  const renderActivity = () => {
    const a = chapter.activity;
    switch (a.kind) {
      case "freetext":
        return <FreeTextView activity={a} busy={saving || submit.isPending} onSubmit={handleSubmit} />;
      case "decision":
        return <DecisionView activity={a} busy={saving || submit.isPending} onSubmit={handleSubmit} />;
      case "inspection":
        return <InspectionView activity={a} busy={saving || submit.isPending} onSubmit={handleSubmit} />;
      case "ridealong":
        return <RideAlongView activity={a} busy={saving || submit.isPending} onSubmit={handleSubmit} />;
      case "telemetry":
        return <TelemetryView activity={a} busy={saving || submit.isPending} onSubmit={handleSubmit} />;
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#0b0d16]">
      {/* Fondo */}
      <div className="absolute inset-0">
        <img
          key={scene}
          src={scene}
          alt=""
          className="kenburns h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d16] via-[#0b0d16]/55 to-[#0b0d16]/35" />
      </div>

      {/* Barra superior */}
      {phase !== "intro" && (
        <header className="relative z-10 flex items-center justify-between border-b border-white/10 bg-black/40 px-4 py-3 backdrop-blur-sm sm:px-8">
          <div className="flex items-center gap-3">
            <img src={INTRO.logo} alt="" className="h-8 w-8 object-cover" />
            <div className="leading-tight">
              <p className="font-display text-xs font-bold uppercase tracking-widest text-white">
                {chapter?.day ?? ""}
              </p>
              <p className="font-code text-[10px] uppercase text-white/50">
                {chapter?.location ?? ""}
              </p>
            </div>
          </div>
          <p className="font-code text-[11px] uppercase tracking-widest text-white/50">
            Día {chapterIdx + 1} de {CHAPTERS.length}
          </p>
        </header>
      )}

      {/* Contenido */}
      <div
        ref={scrollRef}
        className="relative z-10 flex flex-1 flex-col overflow-y-auto"
      >
        {phase === "intro" && (
          <WeekIntro
            participant={participant.name}
            onStart={() => setPhase("chapter")}
          />
        )}

        {phase === "chapter" && chapter && (
          <div className="relative flex-1">
            {/* Título del día */}
            <div className="pointer-events-none relative z-10 mx-auto w-full max-w-3xl px-4 pt-10 sm:pt-16">
              <p className="step-in font-code text-xs uppercase tracking-[0.35em] text-[#ff8a50]">
                {chapter.day} · {chapter.location}
              </p>
              <h2 className="step-in mt-2 font-display text-4xl font-bold uppercase leading-none text-white drop-shadow-lg sm:text-5xl">
                {chapter.title}
              </h2>
            </div>
            <DialogueScene chapter={chapter} onDone={() => setPhase("activity")} />
          </div>
        )}

        {phase === "activity" && chapter && (
          <div className="flex flex-1 flex-col justify-center py-8">
            <div className="mx-auto mb-5 w-full max-w-3xl px-4">
              <p className="font-code text-xs uppercase tracking-[0.35em] text-[#ff8a50]">
                {chapter.day} · {chapter.title}
              </p>
            </div>
            {renderActivity()}
          </div>
        )}

        {phase === "outro" && chapter && (
          <div className="flex flex-1 flex-col justify-center py-8">
            <OutroView text={chapter.outro} last={last} busy={saving || complete.isPending} onNext={next} />
          </div>
        )}
      </div>
    </div>
  );
}
