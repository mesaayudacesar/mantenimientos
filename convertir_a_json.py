import pandas as pd
import json

# Leer el archivo Excel
df = pd.read_excel('base de datos cesar.xlsx')

# Reemplazar NaN con None para JSON válido
df = df.where(pd.notna(df), None)

# Convertir a lista de diccionarios
datos = df.to_dict('records')

# Guardar como JSON
with open('datos_puntos.json', 'w', encoding='utf-8') as f:
    json.dump(datos, f, ensure_ascii=False, indent=2)

print(f"✓ Datos convertidos exitosamente!")
print(f"  Total de puntos: {len(datos)}")
print(f"  Archivo generado: datos_puntos.json")

# Obtener estadísticas para los filtros
tecnicos = df['TECNICO  ASIGNADO '].unique()
cdas = df['NOMBRE DE CENTRO DE COSTO'].unique()

print(f"\n  Técnicos únicos: {len(tecnicos)}")
print(f"  CDAs únicos: {len(cdas)}")
