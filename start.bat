@echo off
REM Starts the local server and opens the app in your browser.
REM You only need this for phone access or automatic folder loading —
REM on this PC you can also just double-click index.html.

cd /d "%~dp0"

set PY=
where py >nul 2>nul && set PY=py -3
if "%PY%"=="" (where python >nul 2>nul && set PY=python)

if "%PY%"=="" (
  echo.
  echo   Python was not found.
  echo   Either install it from https://python.org  ^(tick "Add to PATH"^),
  echo   or simply double-click index.html instead - that works without Python.
  echo.
  pause
  exit /b 1
)

start "" http://localhost:8080
%PY% tools\serve.py --port 8080

pause
