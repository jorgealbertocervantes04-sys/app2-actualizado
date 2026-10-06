import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import QRCode from "qrcode";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AREAS,
  CHAPTERS,
  INTRO,
  REEVALUATION_DAYS,
  VERDICT_LABEL,
  getChapterForVariant,
  type AreaId,
  type EvaluationResult,
  type Verdict,
} from "@contracts/course";

const CODE_KEY = "ei_admin_code";

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const VERDICT_BADGE: Record<string, string> = {
  APTO: "bg-emerald-400/15 text-emerald-400",
  APTO_CON_OBSERVACIONES: "bg-amber-400/15 text-amber-400",
  NO_APTO: "bg-red-400/15 text-red-400",
};

interface SessionRow {
  id: number;
  participantId: number;
  status: string;
  totalPct: number | null;
  verdict: string | null;
  resultJson: string | null;
  variant: string;
  attempt: number;
  startedAt: Date | string;
  completedAt: Date | string | null;
}

interface ListRow {
  session: SessionRow;
  participant: { id: number; name: string; employeeNo: string; base: string };
  answered: number;
}

function parseResult(s: SessionRow): EvaluationResult | null {
  if (!s.resultJson) return null;
  try {
    return JSON.parse(s.resultJson) as EvaluationResult;
  } catch {
    return null;
  }
}

function needsReevaluation(s: SessionRow): boolean {
  if (s.status !== "completed" || !s.completedAt) return false;
  const age = Date.now() - new Date(s.completedAt).getTime();
  return age > REEVALUATION_DAYS * 24 * 60 * 60 * 1000;
}

// ── Proyección QR para participantes ─────────────────────────
function QrOverlay({ onClose }: { onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState("");
  const url = window.location.origin;

  useEffect(() => {
    QRCode.toDataURL(url, { width: 560, margin: 2 }).then(setDataUrl);
  }, [url]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0b0d16] px-6">
      <img src={INTRO.logo} alt="TM" className="h-20 w-20 object-cover" />
      <h1 className="mt-8 text-center font-display text-4xl font-bold uppercase text-white sm:text-6xl">
        Escanea y comienza
        <br />
        <span className="text-[#ff6026]">tu semana en TM</span>
      </h1>
      <p className="mt-4 max-w-xl text-center text-white/60">
        Apunta la cámara de tu celular al código. Regístrate con tu nombre y
        número de empleado; tu progreso se guarda solo.
      </p>
      {dataUrl && (
        <img
          src={dataUrl}
          alt="Código QR de acceso"
          className="mt-8 w-[min(70vw,420px)] border-8 border-white"
        />
      )}
      <p className="mt-6 font-code text-sm text-white/50">{url}</p>
      <button
        onClick={onClose}
        className="mt-10 font-code text-xs uppercase tracking-widest text-white/50 underline-offset-4 hover:text-[#ff8a50] hover:underline"
      >
        Cerrar proyección
      </button>
    </div>
  );
}

export default function Admin() {
  const [code, setCode] = useState(
    () => sessionStorage.getItem(CODE_KEY) ?? ""
  );
  const [inputCode, setInputCode] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [sortKey, setSortKey] = useState<"total" | AreaId>("total");
  const [sortAsc, setSortAsc] = useState(false);

  const login = trpc.admin.login.useMutation({
    onSuccess: () => {
      sessionStorage.setItem(CODE_KEY, inputCode);
      setCode(inputCode);
    },
  });

  const list = trpc.admin.list.useQuery(
    { code },
    { enabled: Boolean(code), retry: false }
  );

  const detail = trpc.admin.detail.useQuery(
    { code, sessionId: detailId ?? 0 },
    { enabled: Boolean(code) && detailId !== null }
  );

  const csvAll = trpc.admin.csv.useQuery({ code }, { enabled: false });
  const csvOne = trpc.admin.csvDetail.useQuery(
    { code, sessionId: detailId ?? 0 },
    { enabled: false }
  );

  const logout = () => {
    sessionStorage.removeItem(CODE_KEY);
    setCode("");
    setInputCode("");
  };

  const toggleSort = (k: "total" | AreaId) => {
    if (sortKey === k) setSortAsc(!sortAsc);
    else {
      setSortKey(k);
      setSortAsc(false);
    }
  };

  // ── Pantalla de acceso ──
  if (!code) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="safety-stripe h-2 w-full" />
        <div className="flex flex-1 items-center justify-center px-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              login.mutate({ code: inputCode });
            }}
            className="w-full max-w-sm border border-border bg-card p-8"
          >
            <p className="font-code text-xs uppercase tracking-[0.3em] text-[#ff6026]">
              Acceso restringido
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold uppercase">
              Panel de administración
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ingresa la clave de administrador para proyectar el acceso del
              grupo y consultar los reportes individuales.
            </p>
            <Input
              type="password"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="Clave de administrador"
              className="mt-6 h-12 rounded-none border-input bg-background"
              autoFocus
            />
            {login.isError && (
              <p className="mt-3 border-l-4 border-destructive bg-destructive/10 px-3 py-2 text-sm">
                Clave incorrecta. Inténtalo de nuevo.
              </p>
            )}
            <Button
              type="submit"
              disabled={login.isPending || !inputCode}
              className="mt-5 h-12 w-full rounded-none bg-[#ff6026] font-display font-bold uppercase tracking-widest text-white hover:bg-[#e04e1a]"
            >
              {login.isPending ? "Verificando…" : "Entrar"}
            </Button>
            <Link
              to="/"
              className="mt-4 block text-center text-xs text-muted-foreground underline"
            >
              Volver al inicio
            </Link>
          </form>
        </div>
      </div>
    );
  }

  return (
    <AdminDashboard
      rows={(list.data ?? []) as ListRow[]}
      sortKey={sortKey}
      sortAsc={sortAsc}
      toggleSort={toggleSort}
      onShowQr={() => setShowQr(true)}
      onLogout={logout}
      onDownloadAll={async () => {
        const r = await csvAll.refetch();
        if (r.data)
          downloadCsv(
            `reporte-semana-tm-${new Date().toISOString().slice(0, 10)}.csv`,
            r.data
          );
      }}
      downloadingAll={csvAll.isFetching}
      onOpenDetail={setDetailId}
      showQr={showQr}
      onCloseQr={() => setShowQr(false)}
      detailOpen={detailId !== null}
      onCloseDetail={() => setDetailId(null)}
      detailData={detail.data ?? null}
      onDownloadOne={async () => {
        const r = await csvOne.refetch();
        if (r.data && detail.data)
          downloadCsv(
            `reporte-${detail.data.participant.employeeNo}.csv`,
            r.data
          );
      }}
      downloadingOne={csvOne.isFetching}
    />
  );
}

// ── Tablero principal ─────────────────────────────────────────

function AdminDashboard(props: {
  rows: ListRow[];
  sortKey: "total" | AreaId;
  sortAsc: boolean;
  toggleSort: (k: "total" | AreaId) => void;
  onShowQr: () => void;
  onLogout: () => void;
  onDownloadAll: () => void;
  downloadingAll: boolean;
  onOpenDetail: (id: number) => void;
  showQr: boolean;
  onCloseQr: () => void;
  detailOpen: boolean;
  onCloseDetail: () => void;
  detailData: DetailData | null;
  onDownloadOne: () => void;
  downloadingOne: boolean;
}) {
  const { rows, sortKey, sortAsc, toggleSort } = props;

  const completed = rows.filter((r) => r.session.status === "completed");
  const avg = completed.length
    ? Math.round(
        completed.reduce((a, r) => a + (r.session.totalPct ?? 0), 0) /
          completed.length
      )
    : 0;
  const countBy = (v: Verdict) =>
    completed.filter((r) => r.session.verdict === v).length;
  const reevalPending = completed.filter((r) =>
    needsReevaluation(r.session)
  ).length;

  // Salud de la academia: promedio por área entre semanas cerradas
  const areaHealth = useMemo(() => {
    const acc: Record<string, { sum: number; n: number }> = {};
    for (const r of completed) {
      const res = parseResult(r.session);
      if (!res) continue;
      for (const a of res.areas) {
        acc[a.area] ??= { sum: 0, n: 0 };
        acc[a.area].sum += a.pct;
        acc[a.area].n += 1;
      }
    }
    return AREAS.map((a) => ({
      id: a.id,
      short: a.short,
      avg: acc[a.id] ? Math.round(acc[a.id].sum / acc[a.id].n) : null,
    })).sort((a, b) => (a.avg ?? 999) - (b.avg ?? 999));
  }, [completed]);

  // Ranking: última semana cerrada por participante, con columnas por área
  const ranking = useMemo(() => {
    const latest = new Map<number, ListRow>();
    for (const r of completed) {
      const cur = latest.get(r.participant.id);
      if (
        !cur ||
        new Date(r.session.startedAt).getTime() >
          new Date(cur.session.startedAt).getTime()
      )
        latest.set(r.participant.id, r);
    }
    const arr = [...latest.values()].map((r) => ({
      row: r,
      result: parseResult(r.session),
    }));
    const key = (item: (typeof arr)[number]) =>
      sortKey === "total"
        ? (item.row.session.totalPct ?? -1)
        : (item.result?.areas.find((a) => a.area === sortKey)?.pct ?? -1);
    return arr.sort((a, b) => (sortAsc ? key(a) - key(b) : key(b) - key(a)));
  }, [completed, sortKey, sortAsc]);

  // Delta de mejora entre intentos (por participante)
  const improvement = useMemo(() => {
    const byParticipant = new Map<number, ListRow[]>();
    for (const r of rows) {
      const arr = byParticipant.get(r.participant.id) ?? [];
      arr.push(r);
      byParticipant.set(r.participant.id, arr);
    }
    const delta = new Map<number, number>(); // sessionId -> delta pct
    for (const arr of byParticipant.values()) {
      const done = arr
        .filter((r) => r.session.status === "completed")
        .sort((a, b) => a.session.attempt - b.session.attempt);
      for (let i = 1; i < done.length; i++) {
        const prev = done[i - 1].session.totalPct;
        const cur = done[i].session.totalPct;
        if (prev != null && cur != null) delta.set(done[i].session.id, cur - prev);
      }
    }
    return delta;
  }, [rows]);

  return (
    <div className="min-h-screen">
      {props.showQr && <QrOverlay onClose={props.onCloseQr} />}
      <div className="safety-stripe h-2 w-full" />
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="font-code text-[11px] uppercase tracking-[0.3em] text-[#ff6026]">
              Panel de administración
            </p>
            <h1 className="font-display text-2xl font-bold uppercase">
              Semana TM · Seguimiento del grupo
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={props.onShowQr}
              className="h-11 rounded-none bg-[#ff6026] font-display font-bold uppercase tracking-wider text-white hover:bg-[#e04e1a]"
            >
              ▣ Proyectar QR del grupo
            </Button>
            <Button
              variant="outline"
              onClick={props.onDownloadAll}
              disabled={props.downloadingAll}
              className="h-11 rounded-none border-input font-display font-semibold uppercase tracking-wider"
            >
              {props.downloadingAll ? "Generando…" : "CSV general"}
            </Button>
            <Button
              variant="outline"
              onClick={props.onLogout}
              className="h-11 rounded-none border-input font-display font-semibold uppercase tracking-wider"
            >
              Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        {/* KPIs para dirección */}
        <div className="grid grid-cols-2 gap-px overflow-hidden border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
          {[
            { n: String(rows.length), t: "Participantes" },
            { n: String(completed.length), t: "Semanas cerradas" },
            { n: `${avg}%`, t: "Promedio global" },
            { n: String(countBy("APTO")), t: "Aptos" },
            {
              n: String(countBy("APTO_CON_OBSERVACIONES")),
              t: "Con observaciones",
            },
            { n: String(reevalPending), t: `Re-evaluaciones (+${REEVALUATION_DAYS}d)` },
          ].map((s) => (
            <div key={s.t} className="bg-card px-4 py-4">
              <p className="font-display text-3xl font-bold text-[#ff6026]">
                {s.n}
              </p>
              <p className="font-code text-[11px] uppercase tracking-wider text-muted-foreground">
                {s.t}
              </p>
            </div>
          ))}
        </div>

        {/* Salud de la academia */}
        {completed.length > 0 && (
          <section className="mt-8 border border-border">
            <div className="border-b border-border bg-secondary/60 px-4 py-3">
              <p className="font-code text-[11px] uppercase tracking-widest text-muted-foreground">
                Salud de la academia · promedio por área (más débil primero) —
                alimenta el plan de capacitación
              </p>
            </div>
            <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4 lg:grid-cols-7">
              {areaHealth.map((a) => (
                <div key={a.id} className="bg-card px-4 py-4">
                  <p className="font-code text-[10px] uppercase tracking-wider text-muted-foreground">
                    {a.short}
                  </p>
                  <p
                    className={`mt-1 font-display text-2xl font-bold ${
                      a.avg == null
                        ? "text-muted-foreground"
                        : a.avg >= 85
                          ? "text-emerald-400"
                          : a.avg >= 70
                            ? "text-amber-400"
                            : "text-red-400"
                    }`}
                  >
                    {a.avg == null ? "—" : `${a.avg}%`}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Ranking comparativo por área */}
        {ranking.length > 0 && (
          <section className="mt-8">
            <p className="font-code text-[11px] uppercase tracking-widest text-muted-foreground">
              Ranking comparativo (toca un encabezado para ordenar por esa
              área)
            </p>
            <div className="mt-2 overflow-x-auto border border-border">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/60 font-code text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Participante</th>
                    <SortableTh
                      label="Global"
                      active={sortKey === "total"}
                      asc={sortAsc}
                      onClick={() => toggleSort("total")}
                    />
                    {AREAS.map((a) => (
                      <SortableTh
                        key={a.id}
                        label={a.short}
                        active={sortKey === a.id}
                        asc={sortAsc}
                        onClick={() => toggleSort(a.id)}
                      />
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ranking.map(({ row, result }, i) => (
                    <tr
                      key={row.session.id}
                      className="cursor-pointer border-b border-border/60 last:border-0 hover:bg-secondary/30"
                      onClick={() => props.onOpenDetail(row.session.id)}
                    >
                      <td className="px-4 py-2.5 font-code text-xs text-muted-foreground">
                        {i + 1}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium">{row.participant.name}</p>
                        <p className="font-code text-[10px] text-muted-foreground">
                          {row.participant.employeeNo}
                          {row.session.attempt > 1
                            ? ` · intento ${row.session.attempt}`
                            : ""}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 font-code text-sm font-bold text-[#ff6026]">
                        {row.session.totalPct ?? "—"}%
                      </td>
                      {AREAS.map((a) => {
                        const area = result?.areas.find((x) => x.area === a.id);
                        return (
                          <td key={a.id} className="px-4 py-2.5 font-code text-xs">
                            {area == null ? (
                              "—"
                            ) : (
                              <span
                                className={
                                  area.pct >= 85
                                    ? "text-emerald-400"
                                    : area.pct >= 70
                                      ? "text-amber-400"
                                      : "text-red-400"
                                }
                              >
                                {area.pct}%
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Tabla de sesiones */}
        <div className="mt-8 overflow-x-auto border border-border">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/60 font-code text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3">Participante</th>
                <th className="px-4 py-3">No. empleado</th>
                <th className="px-4 py-3">Base</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Intento</th>
                <th className="px-4 py-3">Progreso</th>
                <th className="px-4 py-3">Calif.</th>
                <th className="px-4 py-3">Veredicto</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    Aún no hay participantes. Proyecta el QR para que el grupo
                    se registre desde su celular.
                  </td>
                </tr>
              )}
              {rows.map(({ session, participant, answered }) => {
                const delta = improvement.get(session.id);
                return (
                  <tr
                    key={session.id}
                    className="border-b border-border/60 last:border-0 hover:bg-secondary/30"
                  >
                    <td className="px-4 py-3 font-medium">{participant.name}</td>
                    <td className="px-4 py-3 font-code text-xs">
                      {participant.employeeNo}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {participant.base || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(session.startedAt).toLocaleDateString("es-MX")}
                    </td>
                    <td className="px-4 py-3 font-code text-xs">
                      {session.attempt}
                      {session.variant ? ` · ${session.variant}` : ""}
                    </td>
                    <td className="px-4 py-3 font-code text-xs">
                      {answered}/7 días
                    </td>
                    <td className="px-4 py-3 font-code text-xs">
                      {session.totalPct != null ? `${session.totalPct}%` : "—"}
                      {delta != null && (
                        <span
                          className={`ml-1 ${delta >= 0 ? "text-emerald-400" : "text-red-400"}`}
                        >
                          ({delta >= 0 ? "+" : ""}
                          {delta})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1">
                        {session.verdict ? (
                          <span
                            className={`px-2 py-1 font-code text-[11px] uppercase ${VERDICT_BADGE[session.verdict]}`}
                          >
                            {VERDICT_LABEL[session.verdict as Verdict]}
                          </span>
                        ) : (
                          <span className="px-2 py-1 font-code text-[11px] uppercase text-muted-foreground">
                            En progreso
                          </span>
                        )}
                        {needsReevaluation(session) && (
                          <span className="bg-sky-400/15 px-2 py-1 font-code text-[11px] uppercase text-sky-400">
                            Re-evaluar
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => props.onOpenDetail(session.id)}
                        className="h-9 rounded-none border-input font-display text-xs font-semibold uppercase"
                      >
                        Reporte individual
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      {/* Detalle */}
      <Dialog open={props.detailOpen} onOpenChange={(o) => !o && props.onCloseDetail()}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto rounded-none border-border bg-card">
          {props.detailData ? (
            <DetailView
              data={props.detailData}
              onDownload={props.onDownloadOne}
              downloading={props.downloadingOne}
            />
          ) : (
            <p className="py-10 text-center font-code text-sm text-muted-foreground">
              Cargando…
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortableTh({
  label,
  active,
  asc,
  onClick,
}: {
  label: string;
  active: boolean;
  asc: boolean;
  onClick: () => void;
}) {
  return (
    <th className="px-4 py-3">
      <button
        onClick={onClick}
        className={`uppercase tracking-wider ${active ? "text-[#ff6026]" : ""}`}
      >
        {label} {active ? (asc ? "▲" : "▼") : ""}
      </button>
    </th>
  );
}

// ── Detalle individual ────────────────────────────────────────

type Payload = Record<string, unknown>;

type DetailData = {
  participant: { name: string; employeeNo: string; base: string };
  session: {
    startedAt: Date;
    completedAt: Date | null;
    status: string;
    variant: string;
    attempt: number;
  };
  detail: {
    scenarioId: string;
    scenarioTitle: string;
    area: string | null;
    score: number;
    payload: Payload | null;
    aiFeedback: string;
    answeredAt: Date;
  }[];
  history: {
    id: number;
    attempt: number;
    variant: string;
    status: string;
    totalPct: number | null;
    verdict: string | null;
    startedAt: Date;
    completedAt: Date | null;
  }[];
  result: EvaluationResult | null;
};

function hotspotLabel(id: string): string {
  const ch = CHAPTERS.find((c) => c.id === "d3");
  if (ch && ch.activity.kind === "inspection") {
    return ch.activity.hotspots.find((h) => h.id === id)?.label ?? id;
  }
  return id;
}

function momentText(id: string, variant: string): string {
  const base = CHAPTERS.find((c) => c.id === "d4");
  const ch = base ? getChapterForVariant(base, variant) : undefined;
  if (ch && ch.activity.kind === "ridealong") {
    const m = ch.activity.moments.find((x) => x.id === id);
    return m ? `${m.time} · ${m.text}` : id;
  }
  return id;
}

function PayloadView({ scenarioId, payload, variant }: { scenarioId: string; payload: Payload; variant: string }) {
  const text = (k: string) =>
    typeof payload[k] === "string" && (payload[k] as string).trim()
      ? (payload[k] as string)
      : null;

  const blocks: { label: string; body: string }[] = [];
  if (text("verdict")) blocks.push({ label: "Dictamen / decisión", body: text("verdict")! });
  if (text("text")) blocks.push({ label: "Lo que escribió", body: text("text")! });
  if (text("justification")) blocks.push({ label: "Fundamento", body: text("justification")! });
  if (text("report")) blocks.push({ label: "Reporte de inspección", body: text("report")! });
  if (text("diagnosis")) blocks.push({ label: "Conclusión", body: text("diagnosis")! });

  return (
    <div className="mt-2 space-y-2 border-t border-border/60 pt-2">
      {Array.isArray(payload.tapped) && (
        <p className="text-xs text-muted-foreground">
          <b className="text-foreground">Puntos revisados ({payload.tapped.length}):</b>{" "}
          {(payload.tapped as string[]).map((h) => hotspotLabel(h)).join(" · ")}
        </p>
      )}
      {Array.isArray(payload.actions) && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-foreground">
            Intervenciones en el viaje:
          </p>
          {(payload.actions as { momentId: string; action: string }[])
            .filter((a) => a.action === "intervenir")
            .map((a) => (
              <p key={a.momentId} className="text-xs text-muted-foreground">
                ⚑ {momentText(a.momentId, variant)}
              </p>
            ))}
          {(payload.actions as { action: string }[]).every((a) => a.action !== "intervenir") && (
            <p className="text-xs text-muted-foreground">
              No intervino en ningún momento del viaje.
            </p>
          )}
        </div>
      )}
      {Array.isArray(payload.tabsOpened) && (
        <p className="text-xs text-muted-foreground">
          <b className="text-foreground">Fuentes consultadas:</b>{" "}
          {(payload.tabsOpened as string[]).length} de 4
        </p>
      )}
      {blocks.map((b) => (
        <div key={b.label} className="bg-secondary/40 px-3 py-2">
          <p className="font-code text-[10px] uppercase tracking-widest text-muted-foreground">
            {b.label}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-foreground/90">
            {b.body}
          </p>
        </div>
      ))}
      {scenarioId && null}
    </div>
  );
}

function DetailView({
  data,
  onDownload,
  downloading,
}: {
  data: DetailData;
  onDownload: () => void;
  downloading: boolean;
}) {
  const { participant, session, detail, history, result } = data;
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display text-2xl font-bold uppercase">
          {participant.name}
        </DialogTitle>
        <p className="font-code text-xs text-muted-foreground">
          {participant.employeeNo}
          {participant.base ? ` · ${participant.base}` : ""} · Intento{" "}
          {session.attempt}
          {session.variant ? ` · Variante ${session.variant}` : ""} · Inicio{" "}
          {new Date(session.startedAt).toLocaleString("es-MX")}
        </p>
      </DialogHeader>

      {/* Evolución del instructor */}
      {history.length > 1 && (
        <div className="mt-2 border border-border bg-secondary/20 px-4 py-3">
          <p className="font-code text-[11px] uppercase tracking-widest text-muted-foreground">
            Evolución del instructor
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {history.map((h) => (
              <span
                key={h.id}
                className="border border-border bg-card px-3 py-1.5 font-code text-[11px]"
              >
                Intento {h.attempt}
                {h.variant ? ` (${h.variant})` : ""}:{" "}
                {h.status === "completed" ? (
                  <>
                    <b className="text-[#ff6026]">{h.totalPct}%</b>{" "}
                    <span className={VERDICT_BADGE[h.verdict ?? ""] ?? ""}>
                      {h.verdict ? VERDICT_LABEL[h.verdict as Verdict] : ""}
                    </span>
                  </>
                ) : (
                  "en progreso"
                )}{" "}
                · {new Date(h.startedAt).toLocaleDateString("es-MX")}
              </span>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div className="mt-2 flex flex-wrap items-center gap-3 border border-border bg-secondary/40 px-4 py-3">
          <span
            className={`px-2 py-1 font-code text-xs uppercase ${VERDICT_BADGE[result.verdict]}`}
          >
            {VERDICT_LABEL[result.verdict]}
          </span>
          <span className="font-code text-sm">
            Global: <b className="text-[#ff6026]">{result.totalPct}%</b>
          </span>
        </div>
      )}

      {result && (
        <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
          {result.areas.map((a) => (
            <div key={a.area}>
              <p className="font-code text-[10px] uppercase tracking-wider text-muted-foreground">
                {AREAS.find((x) => x.id === a.area)?.short}
              </p>
              <p
                className={`font-code text-sm font-bold ${
                  a.pct >= 85
                    ? "text-emerald-400"
                    : a.pct >= 70
                      ? "text-amber-400"
                      : "text-red-400"
                }`}
              >
                {a.pct}%
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5">
        <p className="font-code text-[11px] uppercase tracking-widest text-muted-foreground">
          Actividad por día (toca para ver lo que hizo y escribió)
        </p>
        <div className="mt-2 space-y-2">
          {detail.map((d) => (
            <div key={d.scenarioId} className="border border-border">
              <button
                onClick={() =>
                  setOpenId(openId === d.scenarioId ? null : d.scenarioId)
                }
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-secondary/30"
              >
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-bold uppercase">
                    {d.scenarioTitle}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {d.area ? AREAS.find((a) => a.id === d.area)?.short : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 font-code text-sm font-semibold ${
                    d.score >= 7
                      ? "text-emerald-400"
                      : d.score >= 4
                        ? "text-amber-400"
                        : "text-red-400"
                  }`}
                >
                  {d.score}/10 {openId === d.scenarioId ? "▴" : "▾"}
                </span>
              </button>
              {openId === d.scenarioId && (
                <div className="border-t border-border bg-secondary/20 px-4 py-3">
                  {d.aiFeedback && (
                    <p className="text-xs leading-relaxed text-foreground/90">
                      <b>Análisis del evaluador:</b> {d.aiFeedback}
                    </p>
                  )}
                  {d.payload && (
                    <PayloadView scenarioId={d.scenarioId} payload={d.payload} variant={session.variant} />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {result && result.plan.length > 0 && (
        <div className="mt-5">
          <p className="font-code text-[11px] uppercase tracking-widest text-muted-foreground">
            Plan de mejora
          </p>
          <div className="mt-2 space-y-3">
            {result.plan.map((p) => (
              <div key={p.area} className="border-l-4 border-[#ff6026] bg-secondary/40 px-4 py-3">
                <p className="font-display text-sm font-bold uppercase">
                  {AREAS.find((a) => a.id === p.area)?.name} · {p.priority} ·{" "}
                  {p.durationWeeks} semanas
                </p>
                <ul className="mt-1 list-inside list-disc text-xs leading-relaxed text-muted-foreground">
                  {p.actions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button
        onClick={onDownload}
        disabled={downloading}
        className="mt-6 h-11 w-full rounded-none bg-[#ff6026] font-display font-bold uppercase tracking-wider text-white hover:bg-[#e04e1a]"
      >
        {downloading ? "Generando…" : "Descargar reporte individual (CSV)"}
      </Button>
    </>
  );
}
