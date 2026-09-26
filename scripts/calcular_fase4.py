import pandas as pd
import os

def clasificacion_correcta(etiqueta):
    return etiqueta.strip().lower() == "acierto"

def clasificacion_ok(etiqueta):
    return etiqueta.strip().lower() in ["acierto", "sirve"]

def calcular_metricas(csv_path, exclude_cases=[]):
    df = pd.read_csv(csv_path, sep=None, engine='python')
    # Normalizar nombres de columnas por si acaso
    df.columns = [c.strip().lower() for c in df.columns]
    
    if "consulta" in df.columns:
        col_caso = "consulta"
    elif "caso" in df.columns:
        col_caso = "caso"
    else:
        print("No se encontro columna caso")
        return
        
    if "clasificacion_humana" in df.columns:
        col_juicio = "clasificacion_humana"
    elif "juicio" in df.columns:
        col_juicio = "juicio"
    else:
        print("No se encontro columna juicio")
        return

    # Filtrar casos
    df = df[~df[col_caso].isin(exclude_cases)]
    
    casos = df[col_caso].unique()
    n_consultas = len(casos)
    
    top1_count = 0
    top5_count = 0
    utilidad_count = 0
    
    for caso in casos:
        g = df[df[col_caso] == caso].sort_values("posicion")
        
        # Top 1 Acierto
        top1_correcto = any((g["posicion"] == 1) & g[col_juicio].apply(clasificacion_correcta))
        # Top 5 Acierto
        top5_correcto = any((g["posicion"] <= 5) & g[col_juicio].apply(clasificacion_correcta))
        # Utilidad (Acierto o Sirve)
        util = any((g["posicion"] <= 5) & g[col_juicio].apply(clasificacion_ok))
        
        if top1_correcto:
            top1_count += 1
        if top5_correcto:
            top5_count += 1
        if util:
            utilidad_count += 1
            
    print(f"Resultados para {os.path.basename(csv_path)} (Casos: {n_consultas})")
    print(f"Top 1 (Precision@1): {top1_count} / {n_consultas} = {top1_count/n_consultas*100:.1f}%")
    print(f"Top 5 (Recall@5):    {top5_count} / {n_consultas} = {top5_count/n_consultas*100:.1f}%")
    print(f"Utilidad:            {utilidad_count} / {n_consultas} = {utilidad_count/n_consultas*100:.1f}%")
    print("-" * 40)

# 1. Nuestro set original (evaluacion_grupo4_original.csv)
# El Grupo 4 no tiene "exactas" marcadas en su evaluación según Ficha 04.
calcular_metricas(r"C:\Users\lucia\Downloads\rag\RAG-V2\CONSULTAS\evaluacion_grupo4_original.csv")

# 2. Set nuevo recibido (evaluacion_A.csv - que es el del Grupo 5)
# Excluiremos C_03 de evaluacion_A por ser la exacta.
calcular_metricas(r"C:\Users\lucia\Downloads\rag\RAG-V2\CONSULTAS\evaluacion_A.csv", exclude_cases=["C_03"])
