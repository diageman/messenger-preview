@echo off
setlocal

set WRAPPER_PORT=3006
set WRAPPER_CONFIG=.\superassistant-config.json

:loop
echo Starting wrapper on port %WRAPPER_PORT% with config %WRAPPER_CONFIG% ...
node superassistant-wrapper.mjs

echo Process crashed with exit code %errorlevel%. Respawning...
timeout /t 1 /nobreak >nul
goto loop