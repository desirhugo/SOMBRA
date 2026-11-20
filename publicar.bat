@echo off
setlocal
rem SOMBRA - publica los cambios en la web (GitHub Pages).
rem Sube a GitHub lo que haya cambiado en esta carpeta. La web se actualiza en unos minutos (hasta 10).
cd /d "%~dp0"
git --version >nul 2>&1 || (echo No se ha encontrado Git. Instalalo desde https://git-scm.com & pause & exit /b 1)
git add -A
git diff --cached --quiet && (echo No hay cambios que publicar. & pause & exit /b 0)
git -c user.name="SOMBRA" -c user.email="sombra@localhost" commit -q -m "Actualizacion %date%"
git push
if errorlevel 1 (echo. & echo No se pudo subir. Revisa la conexion o inicia sesion en GitHub cuando te lo pida. & pause & exit /b 1)
echo.
echo Publicado. La web se actualizara en unos minutos (hasta 10): si no ves el cambio, recarga la pagina.
pause
endlocal
