import type { HealthInfo, SearchResult } from "./types";

export async function healthCheck(
  apiUrl: string
): Promise<{ data: HealthInfo | null; error: string | null }> {
  try {
    const resp = await fetch(`${apiUrl.replace(/\/+$/, "")}/health`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!resp.ok) {
      return { data: null, error: `HTTP ${resp.status}: ${(await resp.text()).slice(0, 200)}` };
    }
    return { data: await resp.json(), error: null };
  } catch (exc) {
    return { data: null, error: exc instanceof Error ? exc.message : String(exc) };
  }
}

export async function searchImage(
  apiUrl: string,
  file: File,
  modelo: string
): Promise<{ data: SearchResult | null; error: string | null }> {
  try {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("modo", "auto");
    fd.append("modelo", modelo);

    const resp = await fetch(`${apiUrl.replace(/\/+$/, "")}/search/image`, {
      method: "POST",
      body: fd,
      signal: AbortSignal.timeout(180000),
    });

    if (!resp.ok) {
      let detalle: string;
      try {
        const body = await resp.json();
        detalle = body.error ?? (await resp.text()).slice(0, 300);
      } catch {
        detalle = (await resp.text()).slice(0, 300);
      }
      return { data: null, error: `Error de la API (${resp.status}): ${detalle}` };
    }

    return { data: await resp.json(), error: null };
  } catch (exc) {
    if (exc instanceof DOMException && exc.name === "AbortError") {
      return { data: null, error: "La API tardó demasiado. Reintentá." };
    }
    return {
      data: null,
      error: "No se pudo conectar a la API. Ejecutá: uvicorn api.main:app --port 8000",
    };
  }
}
