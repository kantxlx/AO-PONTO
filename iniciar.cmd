@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale o Node.js LTS e abra este arquivo novamente.
  echo https://nodejs.org/en/download
  pause
  exit /b 1
)
if not exist "node_modules\vite\package.json" (
  echo Na pasta deste arquivo, abra o terminal e execute: npm.cmd ci --include=dev
  echo Depois abra iniciar.cmd novamente.
  pause
  exit /b 1
)
call npm.cmd run demo
if errorlevel 1 pause

