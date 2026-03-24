#!/usr/bin/env python3
"""
Servidor Flask con SQLite para la aplicación del Mapa de Puntos del Cesar.
Reemplaza server.py con soporte para persistencia en la nube (Render).
"""

import os
import json
import sqlite3
from flask import Flask, request, jsonify, send_from_directory
from datetime import datetime

# ===== Configuración =====
DIRECTORIO_APP = os.path.dirname(os.path.abspath(__file__))
PUERTO = int(os.environ.get('PORT', 8000))

# En Render se usa un disco persistente montado en /data
# En local se usa el directorio de la aplicación
DIRECTORIO_DATOS = os.environ.get('DIRECTORIO_DATOS', DIRECTORIO_APP)
RUTA_BD = os.path.join(DIRECTORIO_DATOS, 'mantenimientos.db')
RUTA_RESPALDO = os.path.join(DIRECTORIO_APP, 'respaldo_mantenimientos.json')

app = Flask(__name__, static_folder=DIRECTORIO_APP)


# ===== Base de Datos =====

def obtener_conexion():
    """Obtiene una conexión a la base de datos SQLite."""
    conexion = sqlite3.connect(RUTA_BD)
    conexion.row_factory = sqlite3.Row  # Permite acceder a las columnas por nombre
    return conexion


def inicializar_bd():
    """Crea la tabla de mantenimientos si no existe e importa el respaldo JSON."""
    conexion = obtener_conexion()
    cursor = conexion.cursor()

    # Crear tabla si no existe
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS mantenimientos (
            codigo_pv TEXT PRIMARY KEY,
            realizado INTEGER NOT NULL DEFAULT 0,
            numero_ticket TEXT DEFAULT '',
            fecha_mantenimiento TEXT DEFAULT '',
            fecha_actualizacion TEXT DEFAULT ''
        )
    ''')
    conexion.commit()

    # Si la tabla está vacía, importar desde el respaldo JSON
    cursor.execute('SELECT COUNT(*) as total FROM mantenimientos')
    total = cursor.fetchone()['total']

    if total == 0 and os.path.exists(RUTA_RESPALDO):
        print(f'⌛ BD vacía, importando respaldo desde {RUTA_RESPALDO}...')
        try:
            with open(RUTA_RESPALDO, 'r', encoding='utf-8') as archivo:
                datos_respaldo = json.load(archivo)

            contador = 0
            for codigo_pv, datos in datos_respaldo.items():
                cursor.execute('''
                    INSERT OR REPLACE INTO mantenimientos
                    (codigo_pv, realizado, numero_ticket, fecha_mantenimiento, fecha_actualizacion)
                    VALUES (?, ?, ?, ?, ?)
                ''', (
                    str(codigo_pv),
                    1 if datos.get('realizado', False) else 0,
                    datos.get('numeroTicket', ''),
                    datos.get('fechaMantenimiento', ''),
                    datetime.now().isoformat()
                ))
                contador += 1

            conexion.commit()
            print(f'✅ {contador} mantenimientos importados desde el respaldo JSON')
        except Exception as error:
            print(f'❌ Error al importar respaldo: {error}')
    elif total > 0:
        print(f'✓ BD ya tiene {total} mantenimientos, no se importa respaldo')

    conexion.close()


# ===== Rutas de la API =====

@app.route('/api/mantenimientos', methods=['GET'])
def obtener_mantenimientos():
    """Devuelve todos los mantenimientos como un objeto JSON indexado por codigoPV."""
    try:
        conexion = obtener_conexion()
        cursor = conexion.cursor()
        cursor.execute('SELECT * FROM mantenimientos')
        filas = cursor.fetchall()
        conexion.close()

        resultado = {}
        for fila in filas:
            resultado[fila['codigo_pv']] = {
                'realizado': bool(fila['realizado']),
                'numeroTicket': fila['numero_ticket'],
                'fechaMantenimiento': fila['fecha_mantenimiento']
            }

        return jsonify(resultado)
    except Exception as error:
        return jsonify({'error': str(error)}), 500


@app.route('/api/mantenimientos', methods=['POST'])
def guardar_mantenimiento():
    """Guarda o actualiza un mantenimiento. Body JSON: {codigoPV, realizado, numeroTicket, fechaMantenimiento}."""
    try:
        datos = request.get_json()
        if not datos or 'codigoPV' not in datos:
            return jsonify({'error': 'Falta el campo codigoPV'}), 400

        codigo_pv = str(datos['codigoPV'])
        realizado = 1 if datos.get('realizado', False) else 0
        numero_ticket = datos.get('numeroTicket', '')
        fecha_mantenimiento = datos.get('fechaMantenimiento', '')

        conexion = obtener_conexion()
        cursor = conexion.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO mantenimientos
            (codigo_pv, realizado, numero_ticket, fecha_mantenimiento, fecha_actualizacion)
            VALUES (?, ?, ?, ?, ?)
        ''', (codigo_pv, realizado, numero_ticket, fecha_mantenimiento, datetime.now().isoformat()))
        conexion.commit()
        conexion.close()

        # Actualizar también el archivo de respaldo JSON
        actualizar_respaldo_json()

        print(f'✓ Mantenimiento guardado: {codigo_pv} (realizado={bool(realizado)})')
        return jsonify({'status': 'ok', 'mensaje': 'Mantenimiento guardado correctamente'})
    except Exception as error:
        return jsonify({'error': str(error)}), 500


# ===== Servir Archivos Estáticos =====

@app.route('/')
def index():
    """Sirve la página principal."""
    return send_from_directory(DIRECTORIO_APP, 'index.html')


@app.route('/<path:nombre_archivo>')
def archivo_estatico(nombre_archivo):
    """Sirve cualquier archivo estático del directorio de la aplicación."""
    return send_from_directory(DIRECTORIO_APP, nombre_archivo)


# ===== Utilidades =====

def actualizar_respaldo_json():
    """Actualiza el archivo respaldo_mantenimientos.json con los datos actuales de la BD."""
    try:
        conexion = obtener_conexion()
        cursor = conexion.cursor()
        cursor.execute('SELECT * FROM mantenimientos')
        filas = cursor.fetchall()
        conexion.close()

        datos = {}
        for fila in filas:
            datos[fila['codigo_pv']] = {
                'realizado': bool(fila['realizado']),
                'numeroTicket': fila['numero_ticket'],
                'fechaMantenimiento': fila['fecha_mantenimiento']
            }

        with open(RUTA_RESPALDO, 'w', encoding='utf-8') as archivo:
            json.dump(datos, archivo, ensure_ascii=False)
    except Exception as error:
        print(f'⚠️ No se pudo actualizar el respaldo JSON: {error}')


# ===== Inicio =====

if __name__ == '__main__':
    print('=' * 70)
    print('   📍 Servidor Flask - Mapa Interactivo de Puntos del Cesar')
    print('=' * 70)
    print(f'   🔌 Puerto: {PUERTO}')
    print(f'   📁 App: {DIRECTORIO_APP}')
    print(f'   💾 BD SQLite: {RUTA_BD}')
    print('=' * 70)

    # Inicializar la base de datos
    inicializar_bd()

    print(f'\n✅ Servidor iniciado en http://localhost:{PUERTO}')
    print('   Presiona Ctrl+C para detener\n')

    app.run(host='0.0.0.0', port=PUERTO, debug=False)
