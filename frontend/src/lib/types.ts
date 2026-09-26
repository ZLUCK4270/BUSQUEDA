export interface HealthInfo {
  status: string;
  products: number;
  embeddings: number;
  model: string;
  desfase_detectado?: boolean;
}

export interface SearchResult {
  resultados: ApiResult[];
  modo?: string;
  modelo?: string;
  tiempo_segundos?: number;
  query_id?: string;
  imagen_procesada_b64?: string;
  preprocesamiento?: {
    ok: boolean;
    backend?: string;
    tiempo_segundos?: number;
    bbox?: string;
    recorte_pct?: number;
    pasos?: string[];
  };
}

export interface ApiResult {
  id: string;
  nombre: string;
  imagen: string;
  url: string;
  proveedor?: string;
  score: number;
  score_reranking?: number;
  score_recuperacion?: number;
  posicion_inicial?: number;
  posicion_final?: number;
  modelo_utilizado?: string;
}

export interface CountryInfo {
  nombre_completo: string;
  seleccion: string;
  colores: string[];
  colores_hex: string[];
  patron_tipico: string;
  elementos: string[];
  equipos_famosos: string[];
  descripcion: string;
}
