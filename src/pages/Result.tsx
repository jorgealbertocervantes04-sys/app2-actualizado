import { Link, useNavigate, useParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import {
  INTRO,
  buildParticipantSummary,
  REINFORCEMENT,
  type AreaId,
} from "@contracts/course";

export default function Result() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const id = Number(sessionId);

  const sessionQ = trpc.eval.session.useQuery(
    { sessionId: id },
    { enabled: Number.isFinite(id), retry: false }
  );
  const resultQ = trpc.eval.result.useQuery(
    { sessionId: id },
    { enabled: Number.isFinite(id), retry: false }
  );

  const name = sessionQ.data?.participant.name ?? "";
  const firstName = name.split(" ")[0];
  const result = resultQ.data?.result ?? null;
  const summary = result ? buildParticipantSummary(result) : null;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#0b0d16]">
      <div className="absolute inset-0">
        <img
          src={INTRO.scene}
          alt=""
          className="h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d16] via-[#0b0d16]/85 to-[#0b0d16]/60" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-14">
        <div className="text-center">
          <img
            src={INTRO.logo}
            alt="TM"
            className="mx-auto h-16 w-16 object-cover"
          />
          <p className="mt-8 font-code text-xs uppercase tracking-[0.35em] text-[#ff8a50]">
            Sábado · 13:00 · Semana cerrada
          </p>
          <h1 className="mt-4 font-display text-4xl font-bold uppercase leading-tight text-white sm:text-5xl">
            Gracias por tu semana{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-white/70">
            Tu bitácora quedó registrada: la inducción del lunes, la prueba de
            manejo, la inspección de la 312, el viaje con Pedro, la conversación
            del viernes y los expedientes del sábado.
          </p>
        </div>

        {/* ── Resumen de la semana (sin puntajes: redacción constructiva) ── */}
        {summary && summary.strengths.length > 0 && (
          <section className="mt-10 border border-white/15 bg-black/50 p-6 backdrop-blur-md">
            <p className="font-code text-[11px] uppercase tracking-[0.3em] text-[#ff8a50]">
              Lo que destacó en tu semana
            </p>
            <ul className="mt-4 space-y-4">
              {summary.strengths.map((s) => (
                <li key={s.area} className="flex gap-3">
                  <span className="mt-1 text-emerald-400">✔</span>
                  <div>
                    <p className="font-display text-sm font-bold uppercase tracking-wide text-white">
                      {s.name}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-white/70">
                      {s.text}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {summary && summary.growth.length > 0 && (
          <section className="mt-6 border border-white/15 bg-black/50 p-6 backdrop-blur-md">
            <p className="font-code text-[11px] uppercase tracking-[0.3em] text-[#ff8a50]">
              Para seguir creciendo
            </p>
            <ul className="mt-4 space-y-4">
              {summary.growth.map((g) => (
                <li key={g.area} className="flex gap-3">
                  <span className="mt-1 text-[#ff8a50]">▸</span>
                  <div>
                    <p className="font-display text-sm font-bold uppercase tracking-wide text-white">
                      {g.name}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-white/70">
                      {g.text}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Material de refuerzo + nueva semana ── */}
        {summary && summary.growth.length > 0 && (
          <section className="mt-6 border border-[#ff6026]/40 bg-[#ff6026]/5 p-6 backdrop-blur-md">
            <p className="font-code text-[11px] uppercase tracking-[0.3em] text-[#ff8a50]">
              Tu material de refuerzo
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Léelo con calma y, cuando estés listo, practica otra semana: los
              escenarios cambian y cada semana cuenta como experiencia.
            </p>
            <div className="mt-5 space-y-5">
              {summary.growth.map((g) => {
                const r = REINFORCEMENT[g.area as AreaId];
                if (!r) return null;
                return (
                  <div key={g.area}>
                    <p className="font-display text-sm font-bold uppercase tracking-wide text-white">
                      {r.title}
                    </p>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-relaxed text-white/65">
                      {r.points.map((p, i) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
            <Button
              onClick={() => navigate("/")}
              className="mt-6 h-12 w-full rounded-none bg-[#ff6026] font-display text-sm font-bold uppercase tracking-widest text-white hover:bg-[#e04e1a]"
            >
              Practicar otra semana
            </Button>
            <p className="mt-3 text-center font-code text-[11px] text-white/40">
              Regístrate con el mismo número de empleado
            </p>
          </section>
        )}

        {/* ── Constancia ── */}
        <div className="mt-10 flex flex-col items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(`/certificado/${id}`)}
            className="h-12 rounded-none border-white/25 px-8 font-display text-sm font-bold uppercase tracking-widest text-white hover:bg-white/10"
          >
            Descargar constancia de participación
          </Button>
          <p className="max-w-md text-center text-sm leading-relaxed text-white/55">
            La dirección de {INTRO.company} revisará tu semana junto con el
            facilitador del curso.
          </p>
          <Link
            to="/"
            className="font-code text-xs uppercase tracking-widest text-white/50 underline-offset-4 hover:text-[#ff8a50] hover:underline"
          >
            Volver al inicio
          </Link>
        </div>
      </main>
    </div>
  );
}
