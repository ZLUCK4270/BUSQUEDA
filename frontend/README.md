# Evaluador del Buscador — Sala 5

**Sublitex · Ficha 03-C · Programación**

Herramienta de evaluación humana para medir la calidad del motor de búsqueda visual.
Consume la API (`POST /search/image`) y calcula **tres métricas** a partir de los juicios del evaluador:
- **Precision@1** — ¿El primer resultado fue el correcto?
- **Recall@5** — ¿El correcto apareció en alguno de los 5 resultados?
- **Utilidad del Top 5** — ¿Los resultados alternativos serían útiles para el cliente?

---

## Requisitos previos

- Node.js 18 o superior
- La API corriendo en `http://localhost:8000` (`uvicorn api.main:app --port 8000`)

---

## Levantar la herramienta

```bash
# Desde la raíz del proyecto:
cd frontend
npm install
npm run dev
```

Abre **http://localhost:3000** en el navegador.

---

## Flujo de evaluación

### 1. Cargar los casos (`casos.json`)

La pantalla inicial pide un archivo JSON con los 10 casos de prueba.
Puedes usar el archivo de ejemplo incluido en `frontend/public/casos.json`
o preparar el tuyo propio con este formato:

```json
{
  "cases": [
    {
      "id_caso": "caso_001",
      "descripcion": "Foto real tienda - camiseta azul",
      "id_correcto": "AIM-P001-001",
      "tipo": "foto_real"
    }
  ]
}
```

> **Regla:** las imágenes de consulta NUNCA pueden provenir del catálogo
> (`data/images_normalized/`). Deben ser fotos externas reales.

### 2. Evaluar cada caso

Para cada uno de los 10 casos:
1. Sube la foto de consulta (externa al catálogo).
2. Haz clic en **"Buscar similares"** — la herramienta llama a la API.
3. Califica cada uno de los 5 resultados con el criterio fijo:

| Juicio | Significa |
|---|---|
| **Acierto** | Es el mismo diseño, aunque cambie el color, el año, el escudo o el sponsor. |
| **Sirve** | No es el mismo, pero se lo mostrarías al cliente y lo aceptaría. |
| **No sirve** | Es otro diseño. |

4. Haz clic en **"Siguiente caso"** — el progreso se guarda automáticamente.

> **Si cierras el navegador**, al volver a abrir `http://localhost:3000`
> continuarás desde donde lo dejaste. No se pierde nada.

### 3. Ver los tres números

Al terminar los 10 casos, la herramienta muestra:
- **Precision@1**, **Recall@5** y **Utilidad del Top 5**
- Interpretación automática (≥70% = motor listo, <50% = necesita mejoras)
- Botón **"Exportar evaluacion.csv"** para descargar los resultados

---

## Formato del CSV exportado

```
caso,tipo,descripcion,id_correcto,posicion,id_resultado,nombre,score,juicio
caso_001,foto_real,"Foto real tienda - azul",AIM-P001-001,1,AIM-P001-001,Guadalcacin Blue,0.8532,Acierto
```

---

## Archivos importantes

| Archivo | Descripción |
|---|---|
| `src/app/page.tsx` | Herramienta completa (React/Next.js) |
| `src/app/api/images/[filename]/route.ts` | Proxy de imágenes desde `data/images_normalized/` |
| `public/casos.json` | 10 casos de ejemplo para probar la herramienta |

---

## Lo que esta herramienta NO hace

- No modifica el buscador, el índice ni los embeddings.
- No genera embeddings propios — solo llama a la API existente.
- No usa imágenes del catálogo como consultas.

*Sublitex · Biblioteca visual · Ficha 03-C · Evaluador · Versión 1.0*
