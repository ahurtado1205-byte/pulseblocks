@echo off
title Publicar ultima version de PulseBlocks
color 0B
echo.
echo ==========================================
echo   PUBLICAR ULTIMA VERSION DE PULSEBLOCKS
echo ==========================================
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0subir-pulseblocks.ps1"
echo.
if errorlevel 1 (
  color 0C
  echo La publicacion no pudo completarse.
  echo Revisa el mensaje anterior.
) else (
  color 0A
  echo Proceso finalizado.
)
echo.
pause
