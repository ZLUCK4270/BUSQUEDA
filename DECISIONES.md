# DECISIONES.md — Evaluador del Buscador

> Ficha 03-C · Sublitex · Fase 1: Entender el problema

---

## P1 · ¿Por qué la medición anterior no sirve?

### Qué se hizo

Las 50 consultas de prueba se generaron con `scripts/generar_consultas_hito2.py`. El script toma **10 imágenes directamente del catálogo** (`data/images_final/`) y a cada una le aplica 5 transformaciones deterministas:

| Versión | Qué hace |
|---|---|
| `exacto` | La imagen original tal cual |
| `sin_marco` | Recorte del contenido (elimina el marco fino) |
| `recoloreado` | Rotación de matiz +60°, saturación ×1.6, brillo ×1.15 |
| `recorte` | Recorte central al 55% |
| `cuerpo` | Mockup sintético: camiseta pegada a una persona dibujada con fondo degradado |

Las 50 consultas son, literalmente, **versiones transformadas de las imágenes que ya están en el índice**.

### Por qué eso hace que el 92% no diga lo que parece

El 92% de SigLIP mide: *"¿el motor puede reconocer sus propias transformaciones?"*. No mide: *"¿el motor encuentra una camiseta real que un usuario sacó con su celular?"*.

**Lo que realmente evalúa esa prueba:**
- Si el embedding de una imagen recortada al 55% se parece al embedding de la imagen completa
- Si el embedding de una imagen con colores rotados se parece al embedding original
- Si el embedding de un mockup sintético se parece al del diseño puro

**Lo que NO evalúa:**
- Fotos reales con ángulos diferentes, iluminación irregular, fondos ruidosos
- Usuarios que sacan fotos en tiendas, con personas, muebles, otras camisetas de fondo
- Imágenes de baja calidad, borrosas, con reflejos
- Consultas que no existen en el catálogo (el usuario busca algo que no está)

**Ejemplo concreto:** Un buscador que devolviera la imagen con mayor correlación de píxeles sacaría 100% en esta prueba (porque las transformaciones conservan la estructura), pero 0% con usuarios reales porque nunca vería una foto idéntica a las del banco.

### Conclusión

La evaluación anterior es un **test de regresión interno**, no una medición de calidad para el negocio. Sirve para saber si una cambio rompe algo, pero no para decir "el buscador funciona bien para los clientes".

---

## P2 · ¿Qué dice el único dato honesto que hay?

### Qué hay en `data/evaluation.csv`

Son 16 filas. Cada fila es un resultado que un humano clasificó. Las columnas son: `consulta`, `resultado_id`, `posicion`, `score`, `clasificacion_humana`, `observacion`.

### Qué juicio recibieron los resultados en posición 1

| Consulta | Score posición 1 | Clasificación |
|---|---|---|
| `q_20260813_204439` | 0.6932 | **Poco similar** |
| `q_20260820_144502` | 0.7626 | **No relacionado** |
| `q_20260820_144749` | 0.8006 | **Poco similar** |
| `q_20260820_145517` | 0.7257 | **No relacionado** |

**Ningún resultado en posición 1 fue clasificado como "Muy similar" o "Similar".** Todos fueron "Poco similar" o "No relacionado".

### Qué conclusión sacar de un score 0.76 marcado "No relacionado"

El score de similitud coseno (0.76) **NO es un porcentaje de probabilidad** de que sea el mismo objeto. Es una medida de distancia en el espacio de embeddings. Un score de 0.76 puede significar:

- Dos camisetas que comparten color dominante pero tienen diseños totalmente distintos
- Dos imágenes con composición similar (centro oscuro, fondo claro) pero de productos diferentes
- Dos textiles con textura parecida pero patron diferente

**El umbral a partir del cual un score es "bueno" no se puede fijar sin datos etiquetados.** Mirando estos datos, vemos que 0.76 ya es "No relacionado" y 0.69 es "Poco similar". No hay una línea clara.

### La fila repetida con dos juicios opuestos

La fila 8 y 9 del CSV son **exactamente la misma respuesta**:

```
q_20260820_144502_3bef9a,AIM-P022-060,2,0.7509,Muy similar,
q_20260820_144502_3bef9a,AIM-P022-060,2,0.7509,No relacionado,
```

Mismo `resultado_id`, mismo `score`, misma `posición`, pero **juicios opuestos**. Esto revela que:

1. **La evaluación humana es subjetiva** — dos personas (o la misma persona en momentos diferentes) pueden ver lo mismo y opinar distinto
2. **No hay criterios claros** — sin definir qué es "Muy similar" vs "No relacionado", cada quien juzga con sus propias reglas
3. **La herramienta que construyamos DEBE tener criterios fijos** para minimizar esta variabilidad

### Conclusión

El evaluation.csv revela que el buscador actual **no pasa el examen humano**: los Top 1 son "Poco similar" o "No relacionado". El score solo no sirve; hace falta un criterio de juicio definido y una herramienta que lo aplique de forma consistente.

---

## P3 · ¿Qué hay que medir exactamente?

El buscador devuelve 5 resultados. Necesitamos 3 métricas que respondan preguntas de negocio distintas:

### Métrica 1: Precision@1 — *¿El primero es el correcto?*

**Qué mide:** De todas las consultas, ¿cuántas veces el resultado en posición 1 es el diseño que el usuario buscaba?

**Por qué importa:** Si el usuario tiene que revisar los 5 resultados para encontrar el correcto, el buscador no está funcionando. El negocio necesita que el primer resultado sea el bueno — es lo que el vendedor muestra primero al cliente.

**Fórmula:** `consultas donde resultado_1 == correcto / total consultas`

### Métrica 2: Recall@5 — *¿El correcto aparece en algún lugar del Top 5?*

**Qué mide:** De todas las consultas, ¿cuántas veces el diseño correcto aparece en alguno de los 5 resultados (posición 1 a 5)?

**Por qué importa:** A veces el primero no es el correcto, pero el correcto está en el Top 5. Si el vendedor tiene que seguir buscando más allá del Top 5, el sistema no le está sirviendo. Esta métrica captura la **cobertura** del buscador.

**Fórmula:** `consultas donde correcto ∈ Top 5 / total consultas`

### Métrica 3: Utilidad del Top 5 (calidad percibida) — *¿Los resultados 2 al 5 son útiles o son basura?*

**Qué mide:** De los resultados que NO son el correcto (posiciones 2-5), ¿cuántos serían útiles para mostrarle a un cliente como alternativa?

**Por qué importa:** Un vendedor no solo necesita encontrar el diseño exacto; también necesita mostrar **alternativas parecidas** que el cliente pueda aceptar. Si el Top 5 tiene 1 correcto y 4 basura, el vendedor tiene que seguir buscando manualmente. Si tiene 1 correcto y 3-4 alternativas útiles, puede trabajar con eso.

**Cómo se mide:** Cada resultado del Top 5 (excepto el correcto) se clasifica como:
- **Sirve**: no es el mismo diseño, pero se lo mostrarías al cliente y lo aceptaría
- **No sirve**: es otro diseño completamente diferente

**Fórmula:** `resultados "Sirve" en posiciones 2-5 / (total consultas × 4)`

### Resumen de las 3 métricas

| Métrica | Pregunta de negocio | Qué captura |
|---|---|---|
| Precision@1 | ¿El primero es el bueno? | Eficiencia del vendedor |
| Recall@5 | ¿El bueno aparece en los 5? | Cobertura del buscador |
| Utilidad Top 5 | ¿Los otros 4 sirven? | Calidad de las alternativas |

---

## P4 · ¿Qué es un caso de prueba válido?

### De dónde puede salir la foto de consulta

La foto de consulta **NUNCA** puede salir del catálogo (`data/images_normalized/` o `data/images_final/`). Si sale del catálogo, caemos en el mismo problema de la P1: estamos midiendo si el motor reconoce sus propias transformaciones, no si encuentra algo real.

**Fuentes válidas:**
- Fotos que un usuario sacó con su celular en una tienda
- Fotos de internet (redes sociales, páginas de proveedores)
- Mockups de proveedores que no están en el catálogo
- Fotos con diferentes ángulos, iluminación, fondos

### De dónde NO puede salir nunca

- De `data/images_normalized/` (el banco limpio)
- De `data/images_final/` (el banco original)
- De `data/consultas/` (las consultas generadas por el script)
- De cualquier transformación de las imágenes del catálogo

### Cómo se garantiza que la respuesta correcta existe

Antes de crear un caso de prueba, se debe **verificar manualmente** que el diseño de la consulta existe en el catálogo. Esto significa:
1. Buscar en `data/products.csv` por nombre o ID
2. Confirmar que la imagen correspondiente está en `data/images_normalized/`
3. Anotar el `id_correcto` que será la respuesta esperada

Si la respuesta correcta no existe en el catálogo, el caso no sirve para evaluar el buscador (el buscador no puede encontrar algo que no está indexado).

### Por qué conviene que las 10 fotos sean de tipos distintos

Si las 10 fotos son todas del mismo tipo (por ejemplo, todas mockups de persona), solo estamos midiendo una capacidad del buscador. Para saber si el buscador sirve para el negocio real, necesitamos probar diferentes escenarios:

| Tipo | Qué prueba |
|---|---|
| Foto limpia de catálogo | Caso ideal (ya lo sabemos que funciona) |
| Foto sin marco | ¿El motor maneja la composición? |
| Foto con colores diferentes | ¿El motor entiende el diseño más allá del color? |
| Foto recortada | ¿El motor reconoce un patrón parcial? |
| Foto mockup/persona | ¿El motor maneja fondos ruidosos? |
| Foto real en tienda | El caso más importante: ¿funciona en la vida real? |
| Foto de internet | ¿El motor maneja diferentes calidades? |
| Foto borrosa/baja calidad | ¿El motor es robusto? |
| Foto con otros productos | ¿El motor distingue entre camisetas? |
| Foto que NO está en el catálogo | ¿El motor devuelve scores bajos cuando no encuentra? |

**La diversidad es clave.** Un buscador que funciona perfecto con fotos de catálogo pero falla con fotos reales no sirve para el negocio.

---

## Resumen ejecutivo

| Pregunta | Respuesta clave |
|---|---|
| P1 | El 92% no sirve porque las consultas son transformaciones del propio catálogo |
| P2 | Los scores altos (0.76+) corresponden a "No relacionado" humano; el score solo no mide calidad |
| P3 | Precision@1, Recall@5, Utilidad del Top 5 — cada una responde una pregunta de negocio |
| P4 | Consultas NUNCA del catálogo; respuestas correctas verificadas; 10 tipos distintos |

---

*DECISIONES.md — Fase 1 completada*

---

## 02 · Decidir — Fase 2

### D1 · Interfaz
**¿Un caso a la vez o todos en una lista? ¿Con mouse o con teclado?**

* **Opción Elegida:** **Un caso a la vez, operado principalmente con atajos de teclado.** La herramienta mostrará la imagen de consulta y los 5 resultados en una sola vista que ocupe la pantalla, permitiendo calificar cada resultado presionando números (ej: 1, 2, 3 para Acierto/Sirve/No sirve).
* **Opción Descartada:** Mostrar todos los casos en una lista larga (scroll) y requerir clics de mouse en botones de radio o menús desplegables para cada resultado.
* **Por qué se eligió:** Evaluar 180 casos seguidos con el mouse en una lista interminable es lento y propenso a fatiga ("scrolling fatigue"). Mostrar un caso a la vez mantiene el foco visual constante, y usar el teclado permite generar "memoria muscular", lo que puede ahorrar entre 2 y 3 segundos por caso (unos 6-9 minutos de ahorro total en tedio).

### D2 · Persistencia
**¿Dónde queda cada juicio? Requisito duro: si el navegador se cierra a la mitad, no se pierde nada, y el archivo se puede abrir sin ustedes.**

* **Opción Elegida:** **Almacenamiento local en el navegador (`localStorage`) en tiempo real, con un botón para "Exportar a CSV" al final.** Cada vez que el evaluador califica un resultado, se guarda inmediatamente en la memoria del navegador.
* **Opción Descartada:** Requerir un backend con base de datos (ej. SQLite/Postgres) para ir guardando, o mantener todo en memoria RAM (`state` temporal) hasta que el usuario le dé a "Guardar todo".
* **Por qué se eligió:** El `localStorage` cumple el requisito duro perfectamente: si se cierra la pestaña por accidente, los datos siguen ahí al volver a abrirla. Exportar a CSV cumple el segundo requisito: el evaluador puede bajar el archivo y abrirlo en Excel sin depender de que nosotros o la herramienta estemos disponibles. Nos ahorra la complejidad innecesaria de montar un servidor con base de datos.

### D3 · Entrada
**¿En qué formato entran los casos? Los 180 de los diseñadores van a llegar después y tienen que entrar por ahí.**

* **Opción Elegida:** **Cargar un archivo `.json` estandarizado desde la interfaz.** La pantalla inicial pedirá al usuario subir un archivo de casos que contenga una lista de las URLs o rutas de las imágenes de consulta.
* **Opción Descartada:** Harcodear las 180 rutas en el código fuente de la herramienta o ingresarlas manualmente una por una en un campo de texto.
* **Por qué se eligió:** Separa los datos del código. Cuando los diseñadores terminen sus 180 casos, solo tienen que entregarlos en el formato JSON acordado (que documentaremos en el README), y cualquier persona podrá subirlos a la herramienta sin necesidad de tocar ni una línea de código ni depender de un desarrollador.

---

## 03 · Construir — Fase 3

### Implementación de la Herramienta de Evaluación

En esta fase se construyó la pantalla de evaluación consumiendo el buscador existente mediante HTTP (`POST /search/image`). La interfaz fue diseñada estrictamente bajo las directrices del encargo:

1. **Estructura Visual**: Se presenta la imagen de consulta en la parte superior para mantener el contexto visual, seguida de los 5 resultados recuperados por el motor en la parte inferior. Al final se muestran las métricas o números correspondientes.
2. **Criterios de Juicio Fijos**: Para estandarizar la evaluación y evitar la subjetividad detectada en la Fase 1, la herramienta integra obligatoriamente tres botones de calificación por cada resultado. El evaluador no decide los criterios, simplemente aplica los siguientes:
   - **Acierto**: Representa el mismo diseño (aunque varíe el color, el año, el escudo o el sponsor).
   - **Sirve**: No es el mismo diseño exacto, pero visualmente es una alternativa válida que se le podría ofrecer al cliente.
   - **No sirve**: Es un diseño completamente diferente y no es útil para la consulta. 

Esta estructura garantiza que los datos recolectados sirvan directamente para calcular las métricas definidas (Precision@1, Recall@5 y Utilidad del Top 5).

---

## 04 · Buscarle el error a lo suyo — Fase 4

**Pregunta:** Si alguien quisiera hacer trampa con nuestra herramienta para que el buscador saliera mejor de lo que es, ¿cómo lo haría?

1. **Sesgo de selección en los casos de prueba (Cherry-picking):** 
   - **Cómo se hace:** Eligiendo como casos de prueba únicamente imágenes limpias, con buena iluminación o que sepamos de antemano que se parecen mucho a las del catálogo (por ejemplo, imágenes recortadas o rotadas del propio catálogo).
   - **Cómo se detecta:** Revisando la diversidad de las consultas de prueba. Si no hay fotos ruidosas, fotos reales tomadas en tienda, o fotos de baja calidad, el set está sesgado.
   - **Cómo se evita:** Exigiendo que un porcentaje fijo de las consultas (ej. 30%) provenga de fotos reales sacadas con celular en entornos no controlados, y que ninguna provenga del banco original.

2. **Laxitud intencional en el criterio "Sirve" (Sesgo de indulgencia):**
   - **Cómo se hace:** Calificando como "Sirve" resultados que visualmente comparten algún color pero que en realidad ningún cliente aceptaría como alternativa, inflando así la métrica de Utilidad del Top 5.
   - **Cómo se detecta:** Haciendo que una segunda persona (o auditor) vuelva a calificar una muestra aleatoria de 20 casos. Si la tasa de "Sirve" del evaluador original es del 80% pero la del auditor es del 30%, hay un problema de laxitud.
   - **Cómo se evita:** Incluyendo en la interfaz o en las instrucciones ejemplos visuales muy claros (fotos de referencia) de lo que constituye el límite entre "Sirve" y "No sirve".

3. **Fatiga del evaluador (Click-through rápido):**
   - **Cómo se hace:** Después del caso número 50, el evaluador se cansa y empieza a presionar rápidamente el atajo para "Acierto" o "Sirve" sin mirar detenidamente, asumiendo que el buscador "generalmente acierta".
   - **Cómo se detecta:** Registrando el tiempo que tarda entre cada evaluación (timestamp). Si un humano tarda menos de 1 segundo en evaluar 5 imágenes, no las está mirando.
   - **Cómo se evita:** Implementando pausas obligatorias cada 50 casos en la herramienta, o invalidando calificaciones que ocurran con milisegundos de diferencia.

---

## 06 · Reglas de trabajo

Durante todo el desarrollo de esta herramienta se aplicaron las siguientes reglas no negociables:

1. **La herramienta mide, no modifica.** No se tocó el buscador, el índice vectorial (`embeddings.npy`), el archivo `products.csv` ni ningún embedding. La herramienta es únicamente un cliente HTTP que consume la API existente para registrar juicios humanos.

2. **Las fotos de consulta nunca provienen del catálogo.** Como quedó explicado en la Fase 1 (P1), usar imágenes del propio catálogo —ya sea directamente o transformadas— no mide la calidad real del buscador, sino su capacidad de reconocer sus propias variantes. Todas las consultas de prueba son fotos externas.

3. **Los prompts de IA son el punto de partida, no el resultado final.** Cada respuesta generada por IA fue contrastada con el código real del proyecto antes de ser incorporada al informe. No se aceptó ninguna afirmación de IA que no pudiera verificarse mirando los archivos.

4. **Bloqueo a los 40 minutos.** Si el equipo llevaba más de 40 minutos atascado en el mismo problema sin avanzar, la instrucción era escalar al coordinador con evidencia de lo que se intentó y el error exacto, en lugar de seguir probando a ciegas.

---

## 07 · Informe diario de la sesión

### Qué quedó funcionando hoy

- La herramienta de evaluación en Next.js carga una imagen de consulta, llama al endpoint `POST /search/image` y muestra los 5 resultados con sus imágenes, nombre, ID y score.
- Los tres botones de juicio fijo (**Acierto / Sirve / No sirve**) funcionan correctamente y persisten en `localStorage` sin necesidad de backend propio.
- El archivo `DECISIONES.md` documenta las cuatro fases completas: entender el problema (P1–P4), decisiones de diseño (D1–D3), construcción de la pantalla y análisis de sesgos.

### Qué no salió y por qué

- La persistencia automática a CSV desde el navegador no se implementó con descarga automática al finalizar; el evaluador debe hacer clic en "Exportar" manualmente. Esto es una limitación conocida del `localStorage` —el navegador no puede escribir directamente al sistema de archivos sin acción del usuario.

### Qué entendimos hoy que ayer no entendíamos

- La diferencia entre un **test de regresión interno** (medir si el motor reconoce sus propias transformaciones) y una **medición de calidad real** (medir si el motor funciona con fotos reales de usuarios). El 92% de SigLIP era del primer tipo, no del segundo.
- Que un score de similitud coseno de 0.76 no significa que haya 76% de probabilidad de ser el mismo diseño. Es una distancia en el espacio de embeddings, y su interpretación depende completamente de los datos etiquetados.

### Qué necesitamos de otro para seguir mañana

- Los 10 casos de prueba propios con fotos externas al catálogo, con el `id_correcto` verificado manualmente en `products.csv`, para poder cargarlos en la herramienta y obtener los primeros números reales.
- Confirmación de que la API sigue corriendo en `http://localhost:8000` antes de la revisión en vivo del lunes.

---

## 08 · Qué sigue después de esto

La herramienta construida en esta ficha tiene una vida útil que va más allá de la entrega del lunes:

- **Si la herramienta pasa la revisión en vivo**, el siguiente paso es incorporar los 180 casos que armarán los diseñadores del equipo. Con ese volumen saldrá el primer número honesto de calidad del buscador para el negocio real.

- **Si el número resultante supera el 70%** (Precision@1 o Utilidad del Top 5), significa que el motor sirve tal como está, y el siguiente paso es cargarlo con los diseños propios de Sublitex para empezar a indexar la biblioteca real.

- **Si el número cae por debajo del 50%**, el motor necesita mejoras. La herramienta —al ser reutilizable y no modificar nada— permite medir exactamente cuánto mejora cada cambio que se haga, en lugar de solo suponer que mejoró.

- **La herramienta no se descarta nunca.** Cada vez que alguien modifique el buscador (cambie el modelo, ajuste el reranking, agregue más imágenes), la evaluación se vuelve a correr con los mismos casos para confirmar que el cambio mejoró y no solo alteró los resultados. Esa es la razón central por la que importó tanto, desde la Fase 4, entender cómo se puede hacer trampa con ella.

---

*DECISIONES.md — Ficha 03-C completa · Sublitex · Versión 1.0 · Entrega: lunes, revisión en vivo*
