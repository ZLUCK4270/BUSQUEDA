"use client";

import { useState, type ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import type { HealthInfo } from "@/lib/types";

export default function SidebarLayout({ children }: { children: ReactNode }) {
  const [apiUrl, setApiUrl] = useState("http://localhost:8000");
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <>
      <Sidebar
        apiUrl={apiUrl}
        onApiUrlChange={setApiUrl}
        health={health}
        onHealthChange={setHealth}
        sidebarOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 p-3 border-b border-[var(--border)] bg-[var(--sidebar-bg)] backdrop-blur-[14px] sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Abrir menú"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 5h14M3 10h14M3 15h14" />
            </svg>
          </button>
          <span className="text-sm font-bold text-[var(--foreground)]">Búsqueda visual</span>
        </header>

        <main className="flex-1 max-w-[1140px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-16">
          {children}
        </main>
      </div>
    </>
  );
}
