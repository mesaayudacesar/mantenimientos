#!/usr/bin/env python3
"""
Servidor web simple para la aplicación del Mapa de Puntos del Cesar
Ejecuta este script para iniciar el servidor y acceder a la aplicación.
"""

import http.server
import socketserver
import os
import webbrowser
import sys
from datetime import datetime

# Configuración
PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Handler personalizado con logging mejorado"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def log_message(self, format, *args):
        """Log personalizado con timestamp"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        sys.stdout.write(f"[{timestamp}] {format % args}\n")
    
    def end_headers(self):
        """Agregar headers CORS y deshabilitar caché para desarrollo"""
        # Headers CORS
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        
        # Deshabilitar caché completamente para archivos JavaScript y JSON
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        
        super().end_headers()

def main():
    """Función principal para iniciar el servidor"""
    
    print("=" * 70)
    print(" 📍 Servidor Web - Mapa Interactivo de Puntos del Cesar")
    print("=" * 70)
    print()
    
    # Verificar que existe index.html
    index_path = os.path.join(DIRECTORY, 'index.html')
    if not os.path.exists(index_path):
        print("❌ Error: No se encuentra index.html")
        print(f"   Buscado en: {index_path}")
        sys.exit(1)
    
    # Verificar que existe datos_puntos.json
    json_path = os.path.join(DIRECTORY, 'datos_puntos.json')
    if not os.path.exists(json_path):
        print("⚠️  Advertencia: No se encuentra datos_puntos.json")
        print("   Por favor ejecuta: python convertir_a_json.py")
        print("   El servidor continuará, pero la aplicación puede no funcionar correctamente.")
        print()
    
    # Configurar el servidor
    try:
        with socketserver.TCPServer(("", PORT), CustomHTTPRequestHandler) as httpd:
            url = f"http://localhost:{PORT}"
            
            print(f"✅ Servidor iniciado exitosamente")
            print()
            print(f"   🌐 URL: {url}")
            print(f"   📁 Directorio: {DIRECTORY}")
            print(f"   🔌 Puerto: {PORT}")
            print()
            print("📝 Controles:")
            print("   - Presiona Ctrl+C para detener el servidor")
            print("   - El navegador se abrirá automáticamente")
            print()
            print("=" * 70)
            print()
            
            # Abrir el navegador automáticamente
            try:
                webbrowser.open(url)
                print(f"✓ Navegador abierto en {url}")
            except:
                print(f"ℹ️  Abre manualmente tu navegador en: {url}")
            
            print()
            print("📊 Logs de solicitudes:")
            print("-" * 70)
            
            # Iniciar el servidor
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print()
        print()
        print("=" * 70)
        print("👋 Servidor detenido por el usuario")
        print("=" * 70)
        sys.exit(0)
        
    except OSError as e:
        if e.errno == 10048:  # Puerto en uso (Windows)
            print(f"❌ Error: El puerto {PORT} ya está en uso")
            print(f"   Intenta cerrar otras aplicaciones o usa otro puerto")
        else:
            print(f"❌ Error: {e}")
        sys.exit(1)
    
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
