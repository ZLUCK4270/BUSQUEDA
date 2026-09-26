"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import type { HealthInfo } from "@/lib/types";
import { healthCheck } from "@/lib/api";

type Tab = "search" | "test" | "config";

const TABS: { id: Tab; label: string; icon: string; href?: string }[] = [
  { id: "search", label: "Búsqueda", icon: "🔍", href: "/search" },
  { id: "test", label: "Test", icon: "🧪", href: "/eval" },
  { id: "config", label: "Config", icon: "⚙️" },
];

function SidebarContent({
  activeTab,
  setActiveTab,
  pathname,
  apiUrl,
  urlInput,
  setUrlInput,
  health,
  healthError,
  checking,
  handleCheck,
  theme,
  toggleTheme,
  howOpen,
  setHowOpen,
}: {
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
  pathname: string;
  apiUrl: string;
  urlInput: string;
  setUrlInput: (v: string) => void;
  health: HealthInfo | null;
  healthError: string | null;
  checking: boolean;
  handleCheck: () => void;
  theme: string;
  toggleTheme: () => void;
  howOpen: boolean;
  setHowOpen: (v: boolean) => void;
}) {
  return (
    <>
      {/* ── Tab buttons ── */}
      <div className="flex flex-col border-b border-[var(--border)]">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const isNav = !!tab.href;

          // Búsqueda y Test son links que navegan directo
          if (isNav && tab.href) {
            return (
              <Link
                key={tab.id}
                href={tab.href}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors relative
                  ${
                    isActive
                      ? "text-[var(--foreground)] bg-white/5"
                      : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/[0.03]"
                  }
                `}
              >
                <span className="text-base flex-shrink-0">{tab.icon}</span>
                <span>{tab.label}</span>
                {isActive && (
                  <span className="absolute left-0 top-1 bottom-1 w-[3px] bg-gradient-to-b from-[#00a8ff] to-[#00d2ff] rounded-r-full" />
                )}
              </Link>
            );
          }

          // Config es tab local (no navega)
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors relative
                ${
                  isActive
                    ? "text-[var(--foreground)] bg-white/5"
                    : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/[0.03]"
                }
              `}
            >
              <span className="text-base flex-shrink-0">{tab.icon}</span>
              <span>{tab.label}</span>
              {isActive && (
                <span className="absolute left-0 top-1 bottom-1 w-[3px] bg-gradient-to-b from-[#00a8ff] to-[#00d2ff] rounded-r-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* ══════════ Búsqueda ══════════ */}
        {activeTab === "search" && (
          <>
            <div>
              <h3 className="text-[0.7rem] font-bold uppercase tracking-[.16em] text-[var(--accent)] mb-2">
                Motor activo
              </h3>
              <div className="p-3.5 rounded-xl border border-[rgba(0,210,255,0.3)] bg-gradient-to-br from-[rgba(0,210,255,0.08)] to-[rgba(58,123,213,0.05)]">
                <div className="font-bold text-[#00d2ff] text-sm mb-1">⚡ Fusión</div>
                <div className="text-[0.78rem] text-[var(--muted)] leading-relaxed">
                  CLIP + OpenCLIP + SigLIP. Combina 3 modelos de visión para
                  ser robusto a oclusiones y variaciones.
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-[0.7rem] font-bold uppercase tracking-[.16em] text-[var(--accent)] mb-2">
                Identificación
              </h3>
              <div className="p-3 rounded-xl border border-[rgba(52,211,153,0.25)] bg-[rgba(52,211,153,0.05)] text-[0.78rem] text-[#8ef0c1] leading-relaxed">
                Identifica <b>país</b> y <b>equipo</b> por colores,
                patrón y elementos distintivos.
              </div>
            </div>

            <hr className="border-[var(--border)]" />

            <div>
              <button
                onClick={() => setHowOpen(!howOpen)}
                className="w-full flex items-center justify-between text-sm font-semibold text-[var(--foreground)] hover:text-[var(--accent)] transition-colors"
              >
                <span>Cómo funciona</span>
                <span className={`text-xs transition-transform ${howOpen ? "rotate-180" : ""}`}>▾</span>
              </button>
              {howOpen && (
                <ol className="mt-3 text-[0.78rem] text-[var(--muted)] space-y-2 list-decimal list-inside leading-relaxed">
                  <li><b>Subís</b> una imagen (JPG/JPEG/PNG).</li>
                  <li>La <b>API</b> la prepara y genera embeddings.</li>
                  <li>El <b>motor</b> recupera 200 candidatos y los reordena.</li>
                  <li>El sistema <b>identifica</b> país y equipo.</li>
                  <li>Se muestran las <b>5 más parecidas</b> con score.</li>
                </ol>
              )}
            </div>
          </>
        )}

        {/* ══════════ Test ══════════ */}
        {activeTab === "test" && (
          <>
            <div>
              <h3 className="text-[0.7rem] font-bold uppercase tracking-[.16em] text-[var(--accent)] mb-2">
                Criterios de juicio
              </h3>
              <p className="text-[0.72rem] text-[var(--muted)] mb-2">Fijos — el evaluador no los decide:</p>
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold text-xs w-16 flex-shrink-0">Acierto</span>
                  <span className="text-[0.72rem] text-[var(--muted)]">
                    Es el mismo diseño, aunque cambie color, año, escudo o sponsor.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold text-xs w-16 flex-shrink-0">Sirve</span>
                  <span className="text-[0.72rem] text-[var(--muted)]">
                    No es el mismo, pero se lo mostrarías al cliente.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-rose-400 font-bold text-xs w-16 flex-shrink-0">No sirve</span>
                  <span className="text-[0.72rem] text-[var(--muted)]">Es otro diseño.</span>
                </div>
              </div>
            </div>

            <hr className="border-[var(--border)]" />

            <div>
              <h3 className="text-[0.7rem] font-bold uppercase tracking-[.16em] text-[var(--accent)] mb-2">
                Métricas
              </h3>
              <div className="space-y-2 text-[0.78rem]">
                <div className="flex items-start gap-2">
                  <span className="text-[#7fd4ff] font-mono font-bold">P@1</span>
                  <span className="text-[var(--muted)]">¿El primero es el bueno?</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#7fd4ff] font-mono font-bold">R@5</span>
                  <span className="text-[var(--muted)]">¿El bueno aparece en los 5?</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#7fd4ff] font-mono font-bold">Util</span>
                  <span className="text-[var(--muted)]">¿Los otros 4 sirven?</span>
                </div>
              </div>
            </div>

            <hr className="border-[var(--border)]" />

            <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <h3 className="text-[0.7rem] font-bold uppercase tracking-[.16em] text-amber-400 mb-1.5">Reglas</h3>
              <ul className="text-[0.72rem] text-[var(--muted)] space-y-1 list-disc list-inside leading-relaxed">
                <li><b>Nunca</b> usar imágenes del catálogo como consulta</li>
                <li><b>Nunca</b> tocar el buscador ni los embeddings</li>
              </ul>
            </div>
          </>
        )}

        {/* ══════════ Config ══════════ */}
        {activeTab === "config" && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--muted)]">Tema claro</span>
              <button
                onClick={toggleTheme}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  theme === "light" ? "bg-[#00d2ff]" : "bg-[var(--muted)]"
                }`}
                aria-label="Toggle theme"
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform shadow ${
                    theme === "light" ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>

            <hr className="border-[var(--border)]" />

            <div>
              <h3 className="text-[0.7rem] font-bold uppercase tracking-[.16em] text-[var(--accent)] mb-2">
                URL de la API
              </h3>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="http://localhost:8000"
                className="w-full px-3 py-2 rounded-lg bg-[var(--input-bg)] border border-[var(--border)] text-[var(--foreground)] text-sm font-mono focus:outline-none focus:border-[#00d2ff]/50 transition-colors"
              />
            </div>

            <button
              onClick={handleCheck}
              disabled={checking}
              className="w-full py-2.5 rounded-xl font-bold text-sm text-[var(--btn-primary-text)] bg-gradient-to-r from-[#00a8ff] to-[#00d2ff] hover:shadow-[0_10px_32px_rgba(0,190,255,.4)] transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              {checking ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verificando...
                </span>
              ) : (
                "Verificar conexión"
              )}
            </button>

            {healthError && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {healthError}
              </div>
            )}
            {health && (
              <div className="p-3 rounded-xl bg-[#34d399]/8 border border-[#34d399]/20 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#34d399] shadow-[0_0_8px_rgba(52,211,153,.7)]" />
                  <span className="text-sm text-[var(--foreground)] font-semibold">API OK</span>
                </div>
                <div className="text-sm text-[var(--muted)]">
                  {health.products?.toLocaleString()} productos · {health.embeddings?.toLocaleString()} embeddings
                </div>
                <div className="text-xs text-[var(--muted)]">Modelo: {health.model}</div>
                {health.desfase_detectado && (
                  <div className="text-xs text-amber-400 mt-1">⚠ Desfase detectado entre IDs y embeddings</div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

export default function Sidebar({
  apiUrl,
  onApiUrlChange,
  health,
  onHealthChange,
  sidebarOpen,
  onToggle,
  onClose,
}: {
  apiUrl: string;
  onApiUrlChange: (url: string) => void;
  health: HealthInfo | null;
  onHealthChange: (h: HealthInfo | null) => void;
  sidebarOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>(
    pathname.startsWith("/eval") ? "test" : "search"
  );
  const [urlInput, setUrlInput] = useState(apiUrl);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [howOpen, setHowOpen] = useState(false);

  // Hover state for desktop collapse
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    if (!sidebarOpen) onToggle();
  }, [sidebarOpen, onToggle]);

  const handleMouseLeave = useCallback(() => {
    hoverTimeout.current = setTimeout(() => {
      if (sidebarOpen) onToggle();
    }, 200);
  }, [sidebarOpen, onToggle]);

  const handleCheck = async () => {
    onApiUrlChange(urlInput);
    setChecking(true);
    setHealthError(null);
    const { data, error } = await healthCheck(urlInput);
    setChecking(false);
    if (error) {
      setHealthError(error);
      onHealthChange(null);
    } else {
      onHealthChange(data);
    }
  };

  const sharedProps = {
    activeTab,
    setActiveTab,
    pathname,
    apiUrl,
    urlInput,
    setUrlInput,
    health,
    healthError,
    checking,
    handleCheck,
    theme,
    toggleTheme: toggle,
    howOpen,
    setHowOpen,
  };

  return (
    <>
      {/* ═══ Mobile: slide-over with backdrop ═══ */}
      <div className="lg:hidden">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={onClose}
          />
        )}
        <aside
          className={`fixed top-0 left-0 z-50 h-full w-72 flex flex-col
            transition-transform duration-300 ease-in-out
            bg-[var(--sidebar-bg)] border-r border-[var(--border)]
            backdrop-blur-[14px]
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
            <span className="text-sm font-bold text-[var(--foreground)]">Menú</span>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/10 transition-colors"
              aria-label="Cerrar menú"
            >
              ✕
            </button>
          </div>
          <SidebarContent {...sharedProps} />
        </aside>
      </div>

      {/* ═══ Desktop: hover expand/collapse ═══ */}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          width: sidebarOpen ? "18rem" : "3.5rem",
          minWidth: sidebarOpen ? "18rem" : "3.5rem",
        }}
        className={`hidden lg:flex fixed top-0 left-0 z-50 h-full flex-col
          transition-all duration-300 ease-in-out
          bg-[var(--sidebar-bg)] border-r border-[var(--border)]
          backdrop-blur-[14px]
        `}
      >
        {sidebarOpen ? (
          <>
            {/* Toggle button */}
            <div className="flex items-center justify-end px-3 py-2.5 border-b border-[var(--border)]">
              <button
                onClick={onToggle}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/10 transition-colors"
                aria-label="Contraer sidebar"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M10 3L5 8l5 5" />
                </svg>
              </button>
            </div>
            <SidebarContent {...sharedProps} />
          </>
        ) : (
          /* Collapsed: just icons */
          <div className="flex flex-col items-center py-3 gap-3">
            {TABS.map((tab) => (
              <Link
                key={tab.id}
                href={tab.href || "#"}
                onClick={(e) => {
                  if (!tab.href) {
                    e.preventDefault();
                    setActiveTab(tab.id);
                    onToggle();
                  }
                }}
                className={`w-9 h-9 flex items-center justify-center rounded-lg text-base transition-colors ${
                  activeTab === tab.id
                    ? "bg-white/10 text-[var(--foreground)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/5"
                }`}
                title={tab.label}
              >
                {tab.icon}
              </Link>
            ))}
          </div>
        )}
      </aside>
    </>
  );
}
