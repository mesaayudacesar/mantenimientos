@echo off
REM Script para iniciar la aplicación de Mapa de Puntos del Cesar
REM Ejecuta el servidor en segundo plano y abre el navegador

echo ==========================================
echo  Iniciando Mapa de Puntos del Cesar
echo ==========================================
echo.

REM Cambiar al directorio del script
cd /d "%~dp0"

REM Verificar si Python está instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python no esta instalado o no esta en el PATH
    echo Por favor instala Python desde https://www.python.org/
    pause
    exit /b 1
)

REM Verificar si el servidor ya está corriendo
netstat -ano | findstr ":8000" >nul
if not errorlevel 1 (
    echo El servidor ya esta en ejecucion en el puerto 8000
    echo Abriendo navegador...
    timeout /t 2 /nobreak >nul
    start "" "http://localhost:8000"
    exit
)

REM Iniciar el servidor en una ventana minimizada
echo Iniciando servidor...
start /MIN "Servidor Mapa Puntos" python server.py

REM Esperar 5 segundos para que el servidor se inicie completamente
echo Esperando a que el servidor se inicialice...
timeout /t 5 /nobreak >nul

REM Verificar que el servidor está respondiendo
echo Verificando que el servidor este listo...
set max_intentos=10
set contador=0

:check_server
set /a contador+=1
if %contador% gtr %max_intentos% (
    echo ADVERTENCIA: El servidor tardo mas de lo esperado
    echo Abriendo navegador de todas formas...
    goto open_browser
)

timeout /t 1 /nobreak >nul
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:8000' -TimeoutSec 2 -UseBasicParsing; exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    echo Esperando al servidor... (intento %contador%/%max_intentos%)
    goto check_server
)

echo Servidor listo!

:open_browser

REM Abrir el navegador
echo Abriendo navegador en http://localhost:8000...
start "" "http://localhost:8000"

REM Mensaje final
echo.
echo ==========================================
echo  Aplicacion iniciada correctamente
echo ==========================================
echo.
echo El servidor esta corriendo en una ventana minimizada
echo Para detener el servidor, cierra la ventana "Servidor Mapa Puntos"
echo o ejecuta "detener.bat"
echo.

REM Cerrar la ventana de la terminal después de 2 segundos
timeout /t 2 /nobreak >nul
exit
