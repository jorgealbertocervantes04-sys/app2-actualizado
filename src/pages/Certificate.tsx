import { useNavigate, useParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { INTRO } from "@contracts/course";

export default function Certificate() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const id = Number(sessionId);

  const q = trpc.eval.result.useQuery(
    { sessionId: id },
    { enabled: Number.isFinite(id), retry: false }
  );

  const participant = q.data?.participant;
  const session = q.data?.session;
  const date = session?.completedAt
    ? new Date(session.completedAt).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#0b0d16] px-4 py-10">
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .cert-page { box-shadow: none !important; margin: 0 !important; }
          @page { size: letter landscape; margin: 0; }
        }
      `}</style>

      {/* Constancia */}
      <div
        className="cert-page relative flex w-full max-w-[960px] flex-col items-center overflow-hidden border-4 border-[#ff6026] bg-white px-8 py-12 text-center shadow-2xl sm:px-16"
        style={{ aspectRatio: "11 / 8.5" }}
      >
        <div className="absolute left-0 top-0 h-3 w-full bg-[#ff6026]" />
        <div className="absolute bottom-0 left-0 h-3 w-full bg-[#ff6026]" />

        <img src={INTRO.logo} alt="TM" className="mt-2 h-20 w-20 object-cover" />
        <p className="mt-4 font-code text-xs uppercase tracking-[0.4em] text-neutral-500">
          {INTRO.company} · Academia de Operadores
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold uppercase tracking-wide text-neutral-900 sm:text-5xl">
          Constancia de participación
        </h1>

        <p className="mt-8 text-base text-neutral-600">Otorgada a</p>
        <p className="mt-1 border-b-2 border-[#ff6026] px-8 pb-2 font-display text-3xl font-bold text-neutral-900 sm:text-4xl">
          {participant?.name ?? "—"}
        </p>

        <p className="mt-8 max-w-2xl text-base leading-relaxed text-neutral-600">
          Por haber completado la experiencia inmersiva{" "}
          <b className="text-neutral-900">«Una semana en TM»</b>: siete días de
          trabajo en la operación — inducciones, evaluación de maniobras,
          inspección de unidades, acompañamiento en ruta, diagnóstico con datos
          y toma de decisiones.
        </p>

        <div className="mt-auto flex w-full items-end justify-between pt-10">
          <div className="text-left">
            <p className="font-code text-xs uppercase tracking-widest text-neutral-500">
              Fecha
            </p>
            <p className="font-display text-sm font-bold text-neutral-900">
              {date || "—"}
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto w-48 border-b border-neutral-400" />
            <p className="mt-2 font-code text-xs uppercase tracking-widest text-neutral-500">
              Dirección General
            </p>
          </div>
          <div className="text-right">
            <p className="font-code text-xs uppercase tracking-widest text-neutral-500">
              No. empleado
            </p>
            <p className="font-display text-sm font-bold text-neutral-900">
              {participant?.employeeNo ?? "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="no-print mt-8 flex flex-wrap items-center justify-center gap-4">
        <Button
          onClick={() => window.print()}
          className="h-12 rounded-none bg-[#ff6026] px-8 font-display text-sm font-bold uppercase tracking-widest text-white hover:bg-[#e04e1a]"
        >
          Imprimir / guardar como PDF
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate(`/resultado/${id}`)}
          className="h-12 rounded-none border-white/25 px-8 font-display text-sm font-bold uppercase tracking-widest text-white hover:bg-white/10"
        >
          Volver
        </Button>
      </div>
      <p className="no-print mt-4 max-w-md text-center text-xs text-white/40">
        En la ventana de impresión elige «Guardar como PDF» para descargar tu
        constancia.
      </p>
    </div>
  );
}
