# **El evaluador del buscador**

*Sublitex · Ficha 03-C · Programación · Entrega: lunes*  
Esta ficha empieza con preguntas, no con instrucciones. Primero investigan y deciden por escrito; después construyen. Entregan las dos cosas, y en la revisión pesan igual.  
---

**El encargo:** construir la herramienta con la que una persona califica los resultados del buscador y el sistema saca un número honesto de cuánto acierta.  
Trabajan en pareja. La respuesta a las preguntas va en un archivo **DECISIONES.md** que se entrega junto con el código.

## ---

**01 · Entender el problema — Fase 1, antes de codear**

Cuatro preguntas. Se responden por escrito, cortas, en **DECISIONES.md**. Cada una trae un prompt para investigar con IA — úsenlo tal cual y después contrasten lo que les diga con lo que ven en el proyecto.

### **P1 · ¿Por qué la medición anterior no sirve?**

El proyecto reportó 92% de aciertos. Vayan a **scripts/generar\_consultas\_hito2.py** y lean cómo se fabricaron las 50 consultas con las que se midió ese 92%.  
**Respondan:** ¿de dónde salió cada imagen de prueba? ¿Qué le hicieron? ¿Por qué eso hace que el 92% no diga lo que parece decir?  
**Prompt para investigar:**  
*Te voy a pasar un script de Python que genera un conjunto de imágenes de prueba para evaluar un buscador de imágenes por similitud. Quiero que me expliques qué problema metodológico tiene evaluar un buscador con imágenes derivadas del propio catálogo mediante transformaciones deterministas (cambio de matiz, recorte, escala). Explícame qué mide realmente esa evaluación y qué NO mide. Dame un ejemplo concreto de un buscador que sacaría 100% en esa prueba y 0% con usuarios reales.*

### **P2 · ¿Qué dice el único dato honesto que hay?**

Abran **data/evaluation.csv**. Son 16 filas, la única evaluación que hizo un humano mirando resultados de verdad.  
**Respondan:** ¿qué juicio recibieron los resultados que estaban en posición 1? ¿Qué score tenían? ¿Qué conclusión sacan de que un resultado con score 0,76 esté marcado «No relacionado»? Y hay una fila repetida con dos juicios opuestos — ¿qué revela eso?  
**Prompt para investigar:**  
*En un buscador de imágenes por similitud con embeddings CLIP, el resultado trae un "score" de similitud coseno entre 0 y 1\. Explícame por qué ese score NO es un porcentaje de probabilidad de que sea el mismo objeto, y por qué un score de 0.76 puede corresponder a imágenes que una persona considera no relacionadas. Explícame también por qué el umbral a partir del cual un score es "bueno" no se puede fijar sin datos etiquetados.*

### **P3 · ¿Qué hay que medir exactamente?**

El buscador devuelve 5 resultados. Medir solo si el primero es correcto deja fuera algo que al negocio le importa mucho: si los otros cuatro sirven de algo o son relleno.  
**Respondan:** definan por escrito las tres métricas que van a calcular y qué pregunta de negocio contesta cada una. Una de ellas tiene que responder «¿los resultados 2 al 5 son útiles o son basura?».  
**Prompt para investigar:**  
*Explícame las métricas de evaluación de sistemas de recuperación de información: precision@1, recall@k, MRR y NDCG. Para cada una, dime en una frase qué pregunta contesta y cuándo conviene usarla. Después dime cuál usarías para medir un buscador visual de catálogo donde al usuario le importa tanto encontrar el diseño exacto como recibir 4 alternativas parecidas que pueda ofrecerle a un cliente.*

### **P4 · ¿Qué es un caso de prueba válido?**

Van a armar 10 casos ustedes mismos para probar la herramienta.  
**Respondan:** ¿de dónde puede salir la foto de consulta y de dónde no puede salir nunca? ¿Cómo se garantiza que la respuesta correcta existe en el catálogo? ¿Por qué conviene que las 10 fotos sean de tipos distintos y no todas iguales?

## **02 · Decidir — Fase 2, sigue sin codear**

Tres decisiones que son suyas. Cada una se escribe en **DECISIONES.md** con **la opción elegida y la que descartaron**. En la revisión les van a preguntar por la descartada.

| Decisión | Qué tienen que resolver |
| :---- | :---- |
| D1 · Interfaz | ¿Un caso a la vez o todos en una lista? ¿Con mouse o con teclado? Piensen que alguien va a evaluar 180 casos seguidos: lo que ahorre dos segundos por caso ahorra seis minutos de tedio. |
| D2 · Persistencia | ¿Dónde queda cada juicio? Requisito duro: si el navegador se cierra a la mitad, no se pierde nada, y el archivo se puede abrir sin ustedes. |
| D3 · Entrada | ¿En qué formato entran los casos? Los 180 de los diseñadores van a llegar después y tienen que entrar por ahí. Documenten el formato en el README. |

## **03 · Construir — Fase 3**

Ahora sí. En el lenguaje que ya sepan — el buscador ya existe y responde por HTTP, su herramienta solo le pregunta. Empiecen comprobando **GET /health** y mandando una foto a mano por Swagger antes de escribir código.

| Campo | Valor | Por qué |
| :---- | :---- | :---- |
| Lo que ya existe | **POST /search/image** | Le mandas una imagen, te devuelve 5 resultados con id, nombre, imagen, url y score. |
| Lo que construyen | **La pantalla** | Foto de consulta arriba, 5 resultados abajo, tres botones por resultado, y los números al final. |
| El criterio de juicio | **Fijo** | Acierto / Sirve / No sirve. Este no lo deciden ustedes; está definido abajo y va escrito en la propia pantalla. |

| Juicio | Significa |
| :---- | :---- |
| Acierto | Es el mismo diseño, aunque cambie el color, el año, el escudo o el sponsor. |
| Sirve | No es el mismo, pero se lo mostrarías al cliente y lo aceptaría. |
| No sirve | Es otro diseño. |

## **04 · Buscarle el error a lo suyo — Fase 4**

La última media hora del domingo no se programa: se ataca lo propio.  
Escriban en **DECISIONES.md** la respuesta a esto: **«Si alguien quisiera hacer trampa con nuestra herramienta para que el buscador saliera mejor de lo que es, ¿cómo lo haría?»**  
Encontrar una forma vale más que no encontrar ninguna. La evaluación anterior del proyecto falló precisamente porque nadie se hizo esta pregunta.  
**Prompt para investigar:**  
*Estoy construyendo una herramienta donde una persona evalúa manualmente los resultados de un buscador y de ahí sale una métrica de calidad. Dime de qué formas esa métrica se puede inflar sin mentir explícitamente: sesgos del evaluador, sesgo de selección en los casos de prueba, orden de presentación, y cualquier otro que se te ocurra. Para cada uno dime cómo se detecta y cómo se evita.*

## **05 · Qué se entrega y cómo se revisa**

| Entrega | Archivo | Qué contiene |
| :---- | :---- | :---- |
| Entrega 1 | **DECISIONES.md** | Las 4 respuestas de la fase 1, las 3 decisiones de la fase 2 con su alternativa descartada, y la respuesta de la fase 4\. |
| Entrega 2 | **La herramienta** | Funcionando con 10 casos propios cargados, y un README que permita levantarla sin preguntar nada. |
| Entrega 3 | **AI\_LOG.md** | Los prompts que usaron, como en los hitos anteriores. |

En la revisión del lunes se prueba la herramienta en vivo — se levanta con el README, se evalúan los 10 casos, se cierra el navegador a la mitad para ver si se perdió algo, y se miran los tres números. Y después **se les pregunta por el DECISIONES.md, a cada uno por separado**. Una herramienta que funciona con decisiones que nadie sabe defender no aprueba.

## **06 · Reglas**

> * **\[Nunca\] No se toca el buscador, ni el índice, ni products.csv, ni los embeddings.** La herramienta mide; no modifica lo que mide.  
> * **\[Nunca\] No se usan imágenes del catálogo como fotos de consulta.** Si respondieron bien la P1, ya saben por qué.  
> * **\[Con IA\] Los prompts de esta ficha son el punto de partida, no el techo.** Pregunten más, discutan la respuesta, contrástenla con lo que ven en el código del proyecto. Lo que no se acepta es pegar una respuesta de IA en el informe sin haberla verificado.  
> * **\[Si se traban\] Más de 40 minutos en lo mismo: al coordinador, con lo que intentaron y el error.**

## **07 · Informe diario**

*1\. Qué quedó funcionando hoy.*  
*2\. Qué no salió y por qué.*  
*3\. Qué entendieron hoy que ayer no entendían.*  
*4\. Qué necesitan de otro para seguir mañana.*

## ---

**08 · Qué sigue después de esto**

> * **Si la herramienta pasa la revisión:** entran los 180 casos que arman los diseñadores y sale el primer número honesto del proyecto.  
> * **Si el número sale sobre 70%:** el motor sirve, y lo siguiente es cargarle los diseños propios de Sublitex.  
> * **Si sale bajo 50%:** el motor no está listo, y lo siguiente es arreglarlo — ahora con una forma de saber si mejora o solo cambia.  
> * **La herramienta no se tira nunca.** Cada vez que alguien toque el buscador, se vuelve a pasar el examen con ella. Por eso importa tanto que no se pueda hacer trampa con ella, que es de lo que trata la fase 4\.

---

*Sublitex · Biblioteca visual · Ficha 03-C · Evaluador · Versión 1.0 · Entrega: lunes, revisión en vivo*