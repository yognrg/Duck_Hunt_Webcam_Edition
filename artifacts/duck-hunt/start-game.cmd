@echo off
REM Launches Duck Hunt - Webcam Edition dev server.
REM Sets the PORT/BASE_PATH env vars the vite config requires, and preloads a
REM crypto.hash polyfill needed for Vite 7 on Node 21.5 (this machine's version).
cd /d "%~dp0"

REM Build a file:// URL to the polyfill (forward slashes required).
set "POLYFILL=%~dp0scripts\crypto-hash-polyfill.mjs"
set "POLYFILL=%POLYFILL:\=/%"

set "NODE_OPTIONS=--import file:///%POLYFILL%"
set "PORT=5173"
set "BASE_PATH=/"

echo Starting Duck Hunt at http://localhost:5173/
call pnpm run dev
