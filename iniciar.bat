@echo off
setlocal
rem SOMBRA - lanzador local.
rem Si hay Python 3: sirve esta carpeta en http://localhost:8642 y abre el navegador.
rem Si no: abre index.html directamente (file://). Ojo: cada forma guarda sus datos por separado.
cd /d "%~dp0"
title SOMBRA - Shadow Boxing Trainer
set "PORT=8642"
set "URL=http://localhost:%PORT%/"

set "PY="
python --version >nul 2>&1 && set "PY=python"
if not defined PY (
  py -3 --version >nul 2>&1 && set "PY=py -3"
)
if not defined PY (
  echo No se ha encontrado Python 3. Abriendo index.html directamente...
  start "" "%~dp0index.html"
  exit /b 0
)

echo.
echo   SOMBRA - Shadow Boxing Trainer
echo   Servidor local en %URL%
echo   Deja esta ventana abierta mientras entrenas. Cierrala para detener el servidor.
echo.
start "" cmd /c "timeout /t 2 /nobreak >nul & start "" %URL%"
%PY% -m http.server %PORT% --bind 127.0.0.1
if errorlevel 1 (
  echo.
  echo No se pudo iniciar el servidor ^(quiza ya esta abierto en otra ventana^).
  echo Se ha abierto %URL% en el navegador de todas formas.
  pause
)
endlocal
