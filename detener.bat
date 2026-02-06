@echo off
REM Script para detener el servidor de Mapa de Puntos del Cesar

echo ==========================================
echo  Deteniendo Servidor
echo ==========================================
echo.

REM Buscar y terminar todos los procesos pythonw.exe (servidor en segundo plano)
tasklist /FI "IMAGENAME eq pythonw.exe" 2>NUL | find /I /N "pythonw.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo Deteniendo servidor...
    taskkill /F /IM pythonw.exe >nul 2>&1
    echo.
    echo ==========================================
    echo  Servidor detenido exitosamente
    echo ==========================================
) else (
    echo No se encontro ningun servidor en ejecucion
)

echo.
timeout /t 2 /nobreak >nul
