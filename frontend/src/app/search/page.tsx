"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { PAISES_FUTBOL, identifyCountry } from "@/lib/countries";
import type { SearchResult, ApiResult, HealthInfo } from "@/lib/types";
import { healthCheck, searchImage } from "@/lib/api";

const CLASIFICACIONES = ["Muy similar", "Similar", "Poco similar", "No relacionado"];

const ICO = {
  gear: "⚙️", zap: "⚡", cpu: "🧠", info: "ℹ️", sun: "🌞", target: "🎯",
  search: "🔍", trophy: "🏆", wrench: "🛠️", link: "🔗", edit: "✏️",
  shirt: "👕", printer: "🖨️", download: "⬇️",
};

function fmtNum(v: unknown): string {
  if (v === null || v === undefined) return "?";
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return n.toLocaleString("es-PE");
}

function getScore(r: ApiResult): number {
  const s = r.score_reranking ?? r.score;
  return typeof s === "number" ? s : 0;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SearchPage() {
  const [apiUrl] = useState("http://localhost:8000");
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [evaluations, setEvaluations] = useState<Record<number, { clasificacion: string; observacion: string }>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  // Check health on mount
  useState(() => {
    healthCheck("http://localhost:8000").then(({ data }) => {
      if (data) setHealth(data);
    });
  });

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) {
      setError("Solo se aceptan archivos de imagen.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError(null);
    setEvaluations({});
  }, []);

  const handleSearch = useCallback(async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await searchImage(apiUrl, file, "fusion");
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      setResult(data);
    }
  }, [file, apiUrl]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const resultados = useMemo(() => result?.resultados ?? [], [result]);

  return (
    <div className="space-y-0">
      {/* Hero */}
      <div className="mb-8">
        <div className="eyebrow">
          <span className="eyebrow-dot" />
          <span className="eyebrow-text">Búsqueda visual</span>
        </div>
        <h1 className="hero-title">Encuentra camisetas visualmente similares</h1>
        <p className="hero-sub">
          Sube una imagen de una camiseta y el sistema la analiza
          para encontrar las más parecidas de la biblioteca.
        </p>
        <div className="hero-meta">
          {health && (
            <>
              <span>{fmtNum(health.products)} productos</span>
              <span>·</span>
              <span>{fmtNum(health.embeddings)} embeddings</span>
              <span>·</span>
            </>
          )}
          <span className="flex items-center">
            <span className={`dot ${health ? "dot-ok" : "dot-err"}`} />
            API {health ? "activa" : "sin conexión"}
          </span>
        </div>
      </div>

      {/* Upload */}
      <div className="upload-title">Sube una imagen de camiseta</div>
      <div className="upload-hint">JPG, JPEG o PNG · Máximo 200 MB por archivo</div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {!file && (
        <div
          ref={dragRef}
          className={`upload-zone ${dragging ? "border-[#00d2ff] shadow-[0_0_0_1px_rgba(0,210,255,0.15),0_26px_80px_rgba(0,140,255,0.18)]" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <svg className="upload-zone-icon" viewBox="0 0 24 24" fill="none" stroke="#00d2ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <div className="upload-zone-text">
            Arrastra tu imagen aquí<br />o haz clic para elegir archivo
          </div>
        </div>
      )}

      {/* Flow indicator */}
      {!file && (
        <div className="flow">
          <span className="n">01</span> Sube tu imagen
          <span className="arrow">→</span>
          <span className="n">02</span> La analizamos
          <span className="arrow">→</span>
          <span className="n">03</span> Encuentra similares
        </div>
      )}

      {/* Query status + search button */}
      {file && (
        <>
          <div className="query-status">
            <span className="dot dot-ok" />
            Imagen lista: <code>{file.name}</code>
          </div>

          <div className="flex gap-3 items-center mb-6">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="btn-primary px-6 py-3 rounded-xl text-sm disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Procesando...
                </>
              ) : (
                `🔍 Buscar similares`
              )}
            </button>
            <button
              onClick={() => { setFile(null); setPreview(null); setResult(null); setEvaluations({}); }}
              className="btn-secondary px-4 py-3 rounded-xl text-sm"
            >
              Cambiar imagen
            </button>
          </div>

          {/* Preview */}
          {preview && (
            <div className="mb-6">
              <img
                src={preview}
                alt="Consulta"
                className="max-h-64 rounded-2xl border border-[var(--border)] object-contain"
              />
            </div>
          )}
        </>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      {/* Results */}
      {resultados.length > 0 && (
        <div className="mt-4">
          <div className="section-head">
            <div className="section-title">{ICO.trophy} Resultados</div>
            <div className="section-meta">
              Top {resultados.length} · Modo {result?.modo} · Modelo {result?.modelo} · {result?.tiempo_segundos} s
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_2.1fr] gap-6">
            {/* Left column: query info */}
            <div className="space-y-4">
              <div className="section-title">{ICO.search} Consulta</div>
              {preview && (
                <img
                  src={preview}
                  alt="Imagen de consulta"
                  className="w-full rounded-2xl border border-[var(--border)] object-contain"
                />
              )}

              {/* Preprocessed image */}
              {result?.imagen_procesada_b64 && (
                <div>
                  <div className="text-xs text-[var(--muted)] mb-1">Preparada por la API</div>
                  <img
                    src={`data:image/jpeg;base64,${result.imagen_procesada_b64}`}
                    alt="Preprocesada"
                    className="w-full rounded-2xl border border-[var(--border)] object-contain"
                  />
                </div>
              )}

              {/* Preprocessing details */}
              {result?.preprocesamiento?.ok && (
                <details className="expander">
                  <summary className="expander-header px-4 py-3 cursor-pointer text-sm font-semibold">
                    {ICO.wrench} Detalles del preprocesamiento
                  </summary>
                  <div className="px-4 pb-4 text-sm text-[var(--muted)] space-y-1">
                    <div><b>Backend:</b> <code className="text-[var(--foreground)]">{result.preprocesamiento.backend}</code></div>
                    <div><b>Tiempo:</b> <code className="text-[var(--foreground)]">{result.preprocesamiento.tiempo_segundos} s</code></div>
                    {result.preprocesamiento.bbox && (
                      <div><b>BBox:</b> <code className="text-[var(--foreground)]">{result.preprocesamiento.bbox}</code></div>
                    )}
                    {result.preprocesamiento.recorte_pct != null && (
                      <div><b>Recorte:</b> <code className="text-[var(--foreground)]">{result.preprocesamiento.recorte_pct}%</code></div>
                    )}
                    {result.preprocesamiento.pasos && result.preprocesamiento.pasos.length > 0 && (
                      <div>
                        <b>Pasos aplicados:</b>
                        <ul className="list-disc list-inside mt-1">
                          {result.preprocesamiento.pasos.map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </details>
              )}

              {/* Country identification */}
              <div>
                <div className="section-title mt-4">{ICO.target} Identificación</div>
                <div className="prep-panel mt-2">
                  Sube una imagen y el sistema identificará el
                  <b>país</b>, <b>equipo</b>, <b>colores</b> y <b>patrón</b>
                  de la camiseta automáticamente.
                </div>
              </div>
            </div>

            {/* Right column: results */}
            <div className="space-y-0">
              {resultados.map((r, idx) => {
                const rank = idx + 1;
                const score = getScore(r);
                const pct = Math.max(0, Math.min(100, score * 100));
                const country = identifyCountry(r.nombre, r.id);

                const meta: string[] = [];
                if (r.score_recuperacion != null) {
                  const ini = r.posicion_inicial;
                  const fin = r.posicion_final;
                  const pos = ini != null && fin != null ? `#${ini} → #${fin}` : "—";
                  meta.push(`Recuperación: ${r.score_recuperacion.toFixed(4)} · Posición: ${pos}`);
                }
                if (r.modelo_utilizado) {
                  meta.push(`Modelo: ⚡ Fusión`);
                }

                return (
                  <div
                    key={r.id}
                    className="result-card"
                    style={{ animationDelay: `${rank * 70}ms` }}
                  >
                    <div className="result-layout">
                      <img
                        className="result-img"
                        src={`/api/images/${r.imagen}`}
                        alt={r.nombre}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = r.url || "";
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="result-top">
                          <span className={`rank-badge ${rank === 1 ? "rank1" : ""}`}>
                            #{rank}
                          </span>
                          <div className="min-w-0">
                            <div className="result-name">{r.nombre}</div>
                            <div className="result-id">
                              {r.id} · Proveedor: {r.proveedor}
                            </div>
                            {country && (
                              <div className="country-tag">
                                🌍 {country.info.nombre_completo} · {country.info.seleccion}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="score-wrap">
                          <div className="score-label">
                            <span>Score de similitud</span>
                            <span>{score.toFixed(4)}</span>
                          </div>
                          <div className="bar">
                            <div className="bar-fill" style={{ width: `${pct}%` }} />
                          </div>
                        </div>

                        {meta.map((m, i) => (
                          <div key={i} className="meta-line">{m}</div>
                        ))}

                        {r.url && (
                          <div className="meta-line">
                            <a className="api-link" href={r.url} target="_blank" rel="noopener noreferrer">
                              {ICO.link}Abrir imagen original
                            </a>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2 mt-3 flex-wrap">
                          <a
                            href={`/api/images/${r.imagen}`}
                            download
                            className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                          >
                            {ICO.download} Descargar
                          </a>
                          <button
                            onClick={() => window.print()}
                            className="btn-secondary px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                          >
                            {ICO.printer} Imprimir
                          </button>
                        </div>

                        {/* Evaluation expander */}
                        <details className="expander mt-3">
                          <summary className="expander-header px-3 py-2 cursor-pointer text-sm font-semibold">
                            {ICO.edit} Evaluar resultado #{rank}
                          </summary>
                          <div className="px-3 pb-3 space-y-3">
                            <div>
                              <label className="text-xs text-[var(--muted)] block mb-1">Clasificación humana</label>
                              <select
                                value={evaluations[idx]?.clasificacion ?? CLASIFICACIONES[0]}
                                onChange={(e) =>
                                  setEvaluations((prev) => ({
                                    ...prev,
                                    [idx]: { ...prev[idx], clasificacion: e.target.value, observacion: prev[idx]?.observacion ?? "" },
                                  }))
                                }
                                className="w-full px-3 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border)] text-[var(--foreground)] text-sm"
                              >
                                {CLASIFICACIONES.map((c) => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-[var(--muted)] block mb-1">Observación (opcional)</label>
                              <input
                                type="text"
                                value={evaluations[idx]?.observacion ?? ""}
                                onChange={(e) =>
                                  setEvaluations((prev) => ({
                                    ...prev,
                                    [idx]: { clasificacion: prev[idx]?.clasificacion ?? CLASIFICACIONES[0], observacion: e.target.value },
                                  }))
                                }
                                className="w-full px-3 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border)] text-[var(--foreground)] text-sm"
                                placeholder="Escribe una observación..."
                              />
                            </div>
                            <button
                              onClick={() => {
                                const ev = evaluations[idx];
                                if (!ev) return;
                                const row = `${result?.query_id ?? file?.name ?? ""},${r.id},${rank},${score.toFixed(4)},${ev.clasificacion},"${ev.observacion.replace(/"/g, '""')}"`;
                                const header = "consulta,resultado_id,posicion,score,clasificacion_humana,observacion";
                                const existing = localStorage.getItem("eval_rows");
                                const rows = existing ? JSON.parse(existing) as string[] : [];
                                rows.push(row);
                                localStorage.setItem("eval_rows", JSON.stringify(rows));
                                const csv = [header, ...rows].join("\n");
                                downloadBlob(new Blob([csv], { type: "text/csv" }), "evaluation.csv");
                              }}
                              className="btn-primary px-4 py-2 rounded-lg text-xs font-bold"
                            >
                              Guardar evaluación
                            </button>
                          </div>
                        </details>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* No results */}
      {result && resultados.length === 0 && !loading && (
        <div className="text-center text-[var(--muted)] py-12">
          No se encontraron resultados.
        </div>
      )}
    </div>
  );
}
