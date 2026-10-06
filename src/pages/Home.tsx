import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CHAPTERS, DIRECTOR_MESSAGE, INTRO } from "@contracts/course";

export default function Home() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [employeeNo, setEmployeeNo] = useState("");
  const [base, setBase] = useState("");
  const [error, setError] = useState("");

  const start = trpc.eval.start.useMutation({
    onSuccess: (data) => navigate(`/curso/${data.session.id}`),
    onError: (e) => setError(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (name.trim().length < 3 || !employeeNo.trim()) {
      setError("Ingresa tu nombre completo y número de empleado.");
      return;
    }
    start.mutate({
      name: name.trim(),
      employeeNo: employeeNo.trim(),
      base: base.trim(),
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Fondo */}
      <div className="absolute inset-0">
        <img
          src={INTRO.scene}
          alt=""
          className="kenburns h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0d16] via-[#0b0d16]/75 to-[#0b0d16]/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0d16] via-transparent to-[#0b0d16]/50" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-5 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <img
              src={INTRO.logo}
              alt="TM Transportes"
              className="h-11 w-11 object-cover"
            />
            <div className="leading-tight">
              <p className="font-display text-sm font-bold uppercase tracking-widest text-white">
                {INTRO.company}
              </p>
              <p className="font-code text-[11px] text-white/50">
                ACADEMIA DE OPERADORES
              </p>
            </div>
          </div>
          <Link
            to="/admin"
            className="font-code text-xs text-white/50 underline-offset-4 hover:text-[#ff8a50] hover:underline"
          >
            Acceso administrador
          </Link>
        </header>

        <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-5 pb-16 sm:px-8 lg:grid-cols-[1.25fr_1fr] lg:gap-14">
          {/* Hero */}
          <section>
            <p className="font-code text-xs uppercase tracking-[0.35em] text-[#ff8a50]">
              Simulador de operación · 7 días de trabajo
            </p>
            <h1 className="mt-4 font-display text-5xl font-bold uppercase leading-[0.95] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Una semana
              <br />
              <span className="text-[#ff6026]">en TM</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
              {INTRO.paragraphs[0]}
            </p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/60">
              {INTRO.paragraphs[1]}
            </p>

            {/* Mensaje de la dirección */}
            <figure className="mt-8 max-w-xl border-l-4 border-[#ff6026] bg-white/5 px-5 py-4 backdrop-blur-sm">
              <blockquote className="text-sm italic leading-relaxed text-white/80 sm:text-base">
                “{DIRECTOR_MESSAGE.quote}”
              </blockquote>
              <figcaption className="mt-3 font-code text-[11px] uppercase tracking-widest text-[#ff8a50]">
                {DIRECTOR_MESSAGE.from}
              </figcaption>
            </figure>

            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 font-code text-xs uppercase tracking-wider text-white/50">
              <span>▸ Tu semana, tus decisiones</span>
              <span>▸ Se guarda solo</span>
              <span>▸ Desde tu celular</span>
            </div>

            <ol className="mt-8 space-y-1 border-l-2 border-white/15">
              {CHAPTERS.map((c) => (
                <li key={c.id} className="flex items-baseline gap-4 py-1 pl-4">
                  <span className="font-code text-[11px] uppercase text-[#ff8a50]">
                    {c.day.split("·")[0].trim()}
                  </span>
                  <span className="font-display text-sm font-semibold uppercase tracking-wide text-white/80">
                    {c.title}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {/* Registro */}
          <aside>
            <form
              onSubmit={submit}
              className="border border-white/15 bg-black/55 p-6 backdrop-blur-md sm:p-8"
            >
              <h2 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
                Registro
              </h2>
              <p className="mt-1 text-sm text-white/60">
                Tu semana se guarda sola a medida que avanzas. Si ya iniciaste,
                ingresa el mismo número de empleado para continuar donde te
                quedaste.
              </p>

              <div className="mt-6 space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className="font-code text-xs uppercase text-white/70"
                  >
                    Nombre completo
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Martín Herrera López"
                    className="h-12 rounded-none border-white/20 bg-white/5 text-white placeholder:text-white/30"
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="employeeNo"
                    className="font-code text-xs uppercase text-white/70"
                  >
                    Número de empleado
                  </Label>
                  <Input
                    id="employeeNo"
                    value={employeeNo}
                    onChange={(e) => setEmployeeNo(e.target.value)}
                    placeholder="Ej. TM-1042"
                    className="h-12 rounded-none border-white/20 bg-white/5 text-white placeholder:text-white/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="base"
                    className="font-code text-xs uppercase text-white/70"
                  >
                    Base / patio (opcional)
                  </Label>
                  <Input
                    id="base"
                    value={base}
                    onChange={(e) => setBase(e.target.value)}
                    placeholder="Ej. Patio Querétaro"
                    className="h-12 rounded-none border-white/20 bg-white/5 text-white placeholder:text-white/30"
                  />
                </div>

                {error && (
                  <p className="border-l-4 border-red-400 bg-red-400/10 px-3 py-2 text-sm text-red-200">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={start.isPending}
                  className="h-13 min-h-[52px] w-full rounded-none bg-[#ff6026] font-display text-base font-bold uppercase tracking-widest text-white hover:bg-[#e04e1a]"
                >
                  {start.isPending ? "Preparando tu semana…" : "Comenzar mi semana"}
                </Button>
                <p className="text-center font-code text-[11px] text-white/40">
                  Duración aproximada: 25–35 minutos
                </p>
              </div>
            </form>
          </aside>
        </main>
      </div>
    </div>
  );
}
