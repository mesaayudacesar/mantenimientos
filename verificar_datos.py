import sqlite3
import os

RUTA_BD = r'c:\SantiagoLobo\repositorios\puntos cesar\mantenimientos.db'

def verificar_bd():
    if not os.path.exists(RUTA_BD):
        print(f"La base de datos no existe en: {RUTA_BD}")
        return

    try:
        conexion = sqlite3.connect(RUTA_BD)
        cursor = conexion.cursor()
        
        # Verificar tablas
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tablas = cursor.fetchall()
        print(f"Tablas encontradas: {tablas}")
        
        if ('mantenimientos',) in tablas:
            cursor.execute("SELECT COUNT(*) FROM mantenimientos")
            count = cursor.fetchone()[0]
            print(f"Total de registros en 'mantenimientos': {count}")
            
            # Ver los primeros 5 registros
            cursor.execute("SELECT * FROM mantenimientos LIMIT 5")
            filas = cursor.fetchall()
            for fila in filas:
                print(fila)
        else:
            print("La tabla 'mantenimientos' no existe.")
            
        conexion.close()
    except Exception as e:
        print(f"Error al verificar la base de datos: {e}")

if __name__ == "__main__":
    verificar_bd()
