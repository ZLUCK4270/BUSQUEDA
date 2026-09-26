"use client";

import { useState, useEffect, useCallback } from "react";

type EvalCase = {
  id_caso: string;
  descripcion: string;
  id_correcto: string;
  tipo?: string;
};

type ApiResult = {
  id: string;
  nombre: string;
  imagen: string;
  url: string;
  score: number;
  score_reranking?: number;
};

type Rating = "Acierto" | "Sirve" | "No sirve";

type RatedResult = {
  id: string;
  nombre: string;
  imagen: string;
  position: number;
  score: number;
  rating: Rating;
};

type CaseEval = {
  id_caso: string;
  id_correcto: string;
  descripcion: string;
  tipo?: string;
  rated: RatedResult[];
  completed_at: string;
};

type Session = {
  cases: EvalCase[];
  evals: CaseEval[];
  current_idx: number;
};

const LS_KEY = "evaluador_v2_session";

function calcMetrics(evals: CaseEval[]) {
  const n = evals.length;
  if (!n) return { p1: 0, r5: 0, util: 0 };

  let p1 = 0, r5 = 0, utilSum = 0, utilN = 0;

  for (const ev of evals) {
    const top1 = ev.rated.find((r) => r.position === 1);
    if (top1?.rating === "Acierto") p1++;

    const found = ev.rated.find(
      (r) => r.id === ev.id_correcto && r.rating === "Acierto"
    );
    if (found) r5++;

    const others = ev.rated.filter((r) => r.rating !== "Acierto");
    if (others.length) {
      utilSum +=
        others.filter((r) => r.rating === "Sirve").length / others.length;
      utilN++;
    }
  }

  return {
    p1: Math.round((p1 / n) * 100),
    r5: Math.round((r5 / n) * 100),
    util: utilN ? Math.round((utilSum / utilN) * 100) : 100,
  };
}

function exportCSV(evals: CaseEval[]) {
  const rows = [
    "caso,tipo,descripcion,id_correcto,posicion,id_resultado,nombre,score,juicio",
  ];
  for (const ev of evals) {
    for (const r of ev.rated) {
      rows.push(
        [
          ev.id_caso,
          ev.tipo ?? "",
          `"${ev.descripcion}"`,
          ev.id_correcto,
          r.position,
          r.id,
          `"${r.nombre}"`,
          r.score.toFixed(4),
          r.rating,
        ].join(",")
      );
    }
  }
  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "evaluacion.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function CriteriaLegend() {
  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm">
      <p className="font-bold text-amber-500 uppercase tracking-wider text-xs mb-3">
        Criterios de juicio — fijos, no los decides tú
      </p>
      <div className="space-y-2">
        {[
          {
            label: "Acierto",
            color: "text-emerald-500",
            text: "Es el mismo diseño, aunque cambie el color, el año, el escudo o el sponsor.",
          },
          {
            label: "Sirve",
            color: "text-amber-500",
            text: "No es el mismo, pero se lo mostrarías al cliente y lo aceptaría.",
          },
          {
            label: "No sirve",
            color: "text-rose-500",
            text: "Es otro diseño.",
          },
        ].map((c) => (
          <div key={c.label} className="flex items-start gap-3">
            <span className={`w-20 font-black flex-shrink-0 ${c.color}`}>
              {c.label}
            </span>
            <span className="text-[var(--muted)]">{c.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
  gradient,
}: {
  label: string;
  value: number;
  description: string;
  gradient: string;
}) {
  return (
    <div className={`${gradient} rounded-2xl p-6 text-white shadow-lg`}>
      <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">
        {label}
      </p>
      <p className="text-5xl font-black mb-2">{value}%</p>
      <p className="text-xs opacity-70 leading-relaxed">{description}</p>
    </div>
  );
}

function InterpretRow({ label, value }: { label: string; value: number }) {
  const s =
    value >= 70
      ? { icon: "✅", text: "Motor listo para los 180 casos", color: "text-emerald-500" }
      : value >= 50
      ? { icon: "⚠️", text: "Aceptable — margen de mejora", color: "text-amber-500" }
      : { icon: "❌", text: "Motor necesita mejoras antes de producción", color: "text-rose-500" };
  return (
    <div className="flex items-center gap-3 text-sm">
      <span>{s.icon}</span>
      <span className="font-bold w-32 text-[var(--foreground)]">{label}</span>
      <span className={`font-black ${s.color}`}>{value}%</span>
      <span className="text-[var(--muted)]">— {s.text}</span>
    </div>
  );
}

export default function Evaluador() {
  const [phase, setPhase] = useState<"setup" | "evaluating" | "done">("setup");
  const [session, setSession] = useState<Session | null>(null);
  const [queryFile, setQueryFile] = useState<File | null>(null);
  const [queryPreview, setQueryPreview] = useState<string | null>(null);
  const [apiResults, setApiResults] = useState<ApiResult[]>([]);
  const [ratings, setRatings] = useState<Record<string, Rating>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const s: Session = JSON.parse(saved);
        setSession(s);
        if (s.current_idx >= s.cases.length && s.evals.length > 0) {
          setPhase("done");
        } else if (s.cases.length > 0) {
          setPhase("evaluating");
        }
      }
    } catch {}
  }, [mounted]);

  const persist = useCallback((s: Session) => {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
    setSession(s);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleJsonLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string);
        const cases: EvalCase[] = raw.cases ?? raw;
        if (
          !Array.isArray(cases) ||
          !cases.length ||
          !cases[0]?.id_correcto
        ) {
          setError(
            'El JSON debe tener: { "cases": [{ "id_caso", "descripcion", "id_correcto", "tipo" }] }'
          );
          return;
        }
        const s: Session = { cases, evals: [], current_idx: 0 };
        persist(s);
        setPhase("evaluating");
        showToast(`✓ ${cases.length} casos cargados`);
      } catch {
        setError("No se pudo leer el JSON. Verifica que sea válido.");
      }
    };
    reader.readAsText(f);
  };

  const resetSession = () => {
    localStorage.removeItem(LS_KEY);
    setSession(null);
    setPhase("setup");
    setQueryFile(null);
    setQueryPreview(null);
    setApiResults([]);
    setRatings({});
    setError(null);
  };

  const currentCase = session?.cases[session.current_idx] ?? null;

  const handleImageSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Solo se aceptan archivos de imagen.");
      return;
    }
    setQueryFile(file);
    setQueryPreview(URL.createObjectURL(file));
    setApiResults([]);
    setRatings({});
    setError(null);
  };

  const handleSearch = async () => {
    if (!queryFile) return;
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", queryFile);
    fd.append("modo", "auto");
    try {
      const res = await fetch("http://localhost:8000/search/image", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error(`API respondió con error ${res.status}`);
      const data = await res.json();
      const docs: ApiResult[] = data.resultados ?? data;
      setApiResults(docs.slice(0, 5));
      showToast("Resultados recibidos ✓");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(`No se pudo conectar con la API: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRate = (id: string, rating: Rating) => {
    setRatings((prev) => ({ ...prev, [id]: rating }));
  };

  const idPendiente = currentCase?.id_correcto === "_______________";
  const allRated =
    apiResults.length > 0 && apiResults.every((r) => !!ratings[r.id]);

  const handleNextCase = () => {
    if (!session || !currentCase || !allRated) return;

    const rated: RatedResult[] = apiResults.map((r, i) => ({
      id: r.id,
      nombre: r.nombre,
      imagen: r.imagen,
      position: i + 1,
      score: r.score_reranking ?? r.score ?? 0,
      rating: ratings[r.id] as Rating,
    }));

    const newEval: CaseEval = {
      id_caso: currentCase.id_caso,
      id_correcto: currentCase.id_correcto,
      descripcion: currentCase.descripcion,
      tipo: currentCase.tipo,
      rated,
      completed_at: new Date().toISOString(),
    };

    const newSession: Session = {
      ...session,
      evals: [...session.evals, newEval],
      current_idx: session.current_idx + 1,
    };

    persist(newSession);
    setQueryFile(null);
    setQueryPreview(null);
    setApiResults([]);
    setRatings({});

    if (newSession.current_idx >= newSession.cases.length) {
      setPhase("done");
      showToast("¡Evaluación completada! 🎉");
    } else {
      showToast(
        `Caso guardado. Siguiente: ${newSession.cases[newSession.current_idx].id_caso}`
      );
    }
  };

  const metrics = session ? calcMetrics(session.evals) : { p1: 0, r5: 0, util: 0 };

  if (!mounted) return null;

  return (
    <div className="min-h-screen font-sans">
      {/* Toast */}
      <div
        className={`fixed bottom-6 right-6 bg-[var(--foreground)] text-[var(--background)] px-5 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-2 transition-all duration-300 ${
          toast
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <span className="text-sm font-medium">{toast}</span>
      </div>

      {/* Header */}
      <header className="bg-[var(--card-bg)] border-b border-[var(--border)] shadow-sm sticky top-0 z-40 backdrop-blur-[14px]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00a8ff] to-[#00d2ff]">
              Evaluador del Buscador
            </h1>
            <p className="text-xs text-[var(--muted)] font-mono">
              Sublitex · Ficha 03-C · Programación
            </p>
          </div>
          {phase !== "setup" && session && (
            <div className="flex items-center gap-4">
              {phase === "evaluating" && (
                <span className="text-sm font-bold text-[var(--muted)]">
                  Caso {session.current_idx + 1} / {session.cases.length}
                </span>
              )}
              {phase === "done" && (
                <span className="text-sm font-bold text-emerald-500">
                  ✓ {session.evals.length} casos completados
                </span>
              )}
              <button
                onClick={resetSession}
                className="text-xs text-[var(--muted)] hover:text-rose-500 transition-colors border border-[var(--border)] px-3 py-1 rounded-lg hover:border-rose-500/30"
              >
                Nueva sesión
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {phase === "setup" && (
          <div className="flex flex-col items-center gap-8">
            <div className="text-center">
              <h2 className="text-3xl font-black text-[var(--foreground)] mb-2">
                Cargar casos de prueba
              </h2>
              <p className="text-[var(--muted)] max-w-lg">
                Sube el archivo{" "}
                <code className="bg-[var(--input-bg)] px-1.5 py-0.5 rounded font-mono text-sm">
                  casos.json
                </code>{" "}
                con tus 10 casos. El progreso se guarda automáticamente en el
                navegador — si cierras y vuelves a abrir, continúas donde
                dejaste.
              </p>
            </div>

            <label className="w-full max-w-lg cursor-pointer bg-[var(--input-bg)] border-2 border-dashed border-[#00a8ff]/30 rounded-2xl p-10 flex flex-col items-center gap-3 hover:border-[#00a8ff]/60 hover:bg-[#00a8ff]/5 transition-all">
              <span className="text-5xl">📂</span>
              <span className="font-bold text-[var(--foreground)] text-lg">
                Haz clic para cargar casos.json
              </span>
              <span className="text-sm text-[var(--muted)] text-center">
                {"{ cases: [{ id_caso, descripcion, id_correcto, tipo }] }"}
              </span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleJsonLoad}
              />
            </label>

            {error && (
              <p className="text-rose-500 text-sm bg-rose-500/10 px-4 py-3 rounded-xl border border-rose-500/20 max-w-lg w-full">
                {error}
              </p>
            )}

            <div className="w-full max-w-lg bg-[var(--background)] rounded-xl p-5 text-sm font-mono text-emerald-500 leading-relaxed border border-[var(--border)]">
              <p className="text-[var(--muted)] mb-2">{"// casos.json — formato esperado"}</p>
              <p>{"{"}</p>
              <p className="pl-4">{"\"cases\": ["}</p>
              <p className="pl-8">{"{"}</p>
              <p className="pl-10">{"\"id_caso\": \"caso_001\","}</p>
              <p className="pl-10">{"\"descripcion\": \"Foto real tienda - azul\","}</p>
              <p className="pl-10">{"\"id_correcto\": \"AIM-P001-001\","}</p>
              <p className="pl-10">{"\"tipo\": \"foto_real\""}</p>
              <p className="pl-8">{"}"}</p>
              <p className="pl-4">{"]"}</p>
              <p>{"}"}</p>
            </div>

            <div className="w-full max-w-lg">
              <CriteriaLegend />
            </div>
          </div>
        )}

        {phase === "evaluating" && currentCase && session && (
          <>
            <div className="w-full bg-[var(--border)] rounded-full h-2">
              <div
                className="bg-gradient-to-r from-[#00a8ff] to-[#00d2ff] h-2 rounded-full transition-all duration-700"
                style={{
                  width: `${(session.current_idx / session.cases.length) * 100}%`,
                }}
              />
            </div>

            <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] shadow-sm p-5 flex justify-between items-center backdrop-blur-sm">
              <div>
                {currentCase.tipo && (
                  <span className="text-xs font-bold text-[#00a8ff] uppercase tracking-wider">
                    {currentCase.tipo}
                  </span>
                )}
                <h2 className="text-lg font-bold text-[var(--foreground)] mt-0.5">
                  {currentCase.descripcion}
                </h2>
                <p className="text-xs text-[var(--muted)] font-mono mt-1">
                  ID correcto esperado:{" "}
                  <strong className="text-[var(--foreground)]">
                    {currentCase.id_correcto}
                  </strong>
                </p>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <span className="text-4xl font-black text-[var(--muted)] opacity-30">
                  {String(session.current_idx + 1).padStart(2, "0")}
                </span>
                <p className="text-xs text-[var(--muted)]">
                  de {session.cases.length}
                </p>
              </div>
            </div>

            <CriteriaLegend />

            <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] shadow-sm p-5 backdrop-blur-sm">
              <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest mb-4">
                📸 Imagen de consulta
              </h3>
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                {!queryPreview ? (
                  <label className="flex-1 cursor-pointer border-2 border-dashed border-[var(--border)] rounded-xl p-8 flex flex-col items-center gap-2 hover:border-[#00a8ff]/50 hover:bg-[#00a8ff]/5 transition-all">
                    <span className="text-4xl">📷</span>
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      Sube la foto de consulta de este caso
                    </span>
                    <span className="text-xs text-[var(--muted)]">
                      Nunca del catálogo — foto real externa
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        e.target.files?.[0] &&
                        handleImageSelect(e.target.files[0])
                      }
                    />
                  </label>
                ) : (
                  <div className="flex gap-5 items-start">
                    <div className="relative w-44 h-44 rounded-xl overflow-hidden border border-[var(--border)] flex-shrink-0">
                      <img
                        src={queryPreview}
                        alt="Consulta"
                        className="w-full h-full object-cover"
                      />
                      <label className="absolute bottom-2 right-2 bg-[var(--foreground)]/90 text-[var(--background)] text-xs font-bold px-2 py-1 rounded-lg cursor-pointer shadow hover:bg-[var(--foreground)] transition-colors">
                        Cambiar
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            e.target.files?.[0] &&
                            handleImageSelect(e.target.files[0])
                          }
                        />
                      </label>
                    </div>
                    {apiResults.length === 0 && (
                      <button
                        onClick={handleSearch}
                        disabled={loading}
                        className="bg-gradient-to-r from-[#00a8ff] to-[#00d2ff] text-[var(--btn-primary-text)] font-bold py-3 px-6 rounded-xl shadow-lg disabled:opacity-50 hover:scale-105 transition-all flex items-center gap-2 self-center"
                      >
                        {loading ? (
                          <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Buscando...
                          </>
                        ) : (
                          "Buscar similares →"
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
              {error && (
                <p className="mt-3 text-rose-500 text-sm bg-rose-500/10 px-3 py-2 rounded-lg border border-rose-500/20">
                  {error}
                </p>
              )}
            </div>

            {apiResults.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-[var(--muted)] uppercase tracking-widest">
                  🔍 5 resultados del buscador — califica cada uno
                </h3>

                {apiResults.map((result, idx) => {
                  const score = result.score_reranking ?? result.score ?? 0;
                  const isCorrect = result.id === currentCase.id_correcto;
                  const rated = ratings[result.id];

                  return (
                    <div
                      key={result.id}
                      className={`bg-[var(--card-bg)] rounded-2xl border shadow-sm p-5 flex gap-4 items-start transition-all backdrop-blur-sm ${
                        isCorrect
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-[var(--border)]"
                      } ${rated ? "opacity-80" : ""}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-[var(--input-bg)] flex items-center justify-center font-black text-[var(--muted)] text-sm flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </div>

                      <div className="w-28 h-28 flex-shrink-0 rounded-xl overflow-hidden bg-[var(--input-bg)] border border-[var(--border)]">
                        {result.imagen ? (
                          <img
                            src={`/api/images/${result.imagen}`}
                            alt={result.nombre}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://placehold.co/112x112?text=${result.id.slice(-3)}`;
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[var(--muted)] text-xs">
                            Sin imagen
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <div className="min-w-0">
                            <p className="font-bold text-[var(--foreground)] truncate">
                              {result.nombre}
                            </p>
                            <p className="text-xs text-[var(--muted)] font-mono">
                              {result.id}
                            </p>
                            {isCorrect && (
                              <span className="inline-block mt-1 text-xs bg-emerald-500/15 text-emerald-500 font-bold px-2 py-0.5 rounded-full">
                                ✓ ID correcto
                              </span>
                            )}
                          </div>
                          <span className="bg-[#00a8ff]/10 text-[#00d2ff] font-black px-3 py-1.5 rounded-xl text-sm border border-[#00a8ff]/20 flex-shrink-0">
                            {(score * 100).toFixed(1)}%
                          </span>
                        </div>

                        <div className="flex gap-2 mt-3 flex-wrap">
                          {(["Acierto", "Sirve", "No sirve"] as Rating[]).map(
                            (r) => {
                              const active = rated === r;
                              const colorMap = {
                                Acierto: {
                                  active: "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20",
                                  idle: "bg-[var(--input-bg)] text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10",
                                },
                                Sirve: {
                                  active: "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20",
                                  idle: "bg-[var(--input-bg)] text-amber-500 border-amber-500/30 hover:bg-amber-500/10",
                                },
                                "No sirve": {
                                  active: "bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20",
                                  idle: "bg-[var(--input-bg)] text-rose-500 border-rose-500/30 hover:bg-rose-500/10",
                                },
                              };
                              return (
                                <button
                                  key={r}
                                  onClick={() => handleRate(result.id, r)}
                                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                                    active
                                      ? colorMap[r].active
                                      : colorMap[r].idle
                                  }`}
                                >
                                  {r}
                                </button>
                              );
                            }
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <button
                  onClick={handleNextCase}
                  disabled={!allRated}
                  className={`w-full py-4 rounded-2xl font-black text-lg transition-all ${
                    allRated
                      ? "bg-gradient-to-r from-[#00a8ff] to-[#00d2ff] text-[var(--btn-primary-text)] shadow-xl hover:scale-[1.01] hover:shadow-2xl active:scale-[0.99]"
                      : "bg-[var(--input-bg)] text-[var(--muted)] cursor-not-allowed"
                  }`}
                >
                  {allRated
                    ? session.current_idx + 1 >= session.cases.length
                      ? "Finalizar y ver métricas →"
                      : `Siguiente caso (${session.current_idx + 2} / ${session.cases.length}) →`
                    : `Califica los ${apiResults.length - Object.keys(ratings).length} resultado(s) que faltan`}
                </button>
              </div>
            )}
          </>
        )}

        {phase === "done" && session && (
          <div className="flex flex-col items-center gap-8">
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-black text-[var(--foreground)] mb-1">
                Evaluación completada
              </h2>
              <p className="text-[var(--muted)] text-sm">
                {session.evals.length} casos · {new Date().toLocaleDateString("es-PE")}
              </p>
            </div>

            <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4">
              <MetricCard
                label="Precision@1"
                value={metrics.p1}
                description="¿El primer resultado fue el diseño correcto?"
                gradient="bg-gradient-to-br from-[#00a8ff] to-[#0055cc]"
              />
              <MetricCard
                label="Recall@5"
                value={metrics.r5}
                description="¿El correcto apareció en alguno de los 5 resultados?"
                gradient="bg-gradient-to-br from-[#00d2ff] to-[#0077cc]"
              />
              <MetricCard
                label="Utilidad Top 5"
                value={metrics.util}
                description="¿Los resultados alternativos serían útiles para el cliente?"
                gradient="bg-gradient-to-br from-[#7c5cff] to-[#4a30b0]"
              />
            </div>

            <div className="w-full bg-[var(--card-bg)] rounded-2xl border border-[var(--border)] shadow-sm p-5 space-y-3 backdrop-blur-sm">
              <h3 className="font-bold text-[var(--foreground)] text-sm uppercase tracking-wide mb-2">
                Interpretación
              </h3>
              <InterpretRow label="Precision@1" value={metrics.p1} />
              <InterpretRow label="Recall@5" value={metrics.r5} />
              <InterpretRow label="Utilidad" value={metrics.util} />
            </div>

            <div className="w-full">
              <CriteriaLegend />
            </div>

            <div className="flex gap-4 w-full flex-wrap">
              <button
                onClick={() => exportCSV(session.evals)}
                className="flex-1 bg-[var(--foreground)] text-[var(--background)] font-bold py-4 px-6 rounded-2xl hover:opacity-90 transition-colors flex items-center justify-center gap-2"
              >
                📥 Exportar evaluacion.csv
              </button>
              <button
                onClick={resetSession}
                className="px-6 py-4 rounded-2xl border border-[var(--border)] text-[var(--muted)] font-bold hover:bg-[var(--input-bg)] transition-colors"
              >
                Nueva sesión
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
