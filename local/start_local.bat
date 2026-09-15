@echo off
setlocal enabledelayedexpansion
REM ===========================================================================
REM  FindMyArtisan - start the whole app on this Windows machine.
REM
REM    start_local.bat            build if needed, start, wait until ready
REM    start_local.bat --fresh    wipe the database first and reseed
REM    start_local.bat --stop     stop everything
REM    start_local.bat --logs     follow the logs
REM
REM  You can also just double-click this file.
REM  Nothing here touches the live site or the hosted database.
REM ===========================================================================

cd /d "%~dp0"

set "APP_URL=http://localhost:3000"
set "API_URL=http://localhost:5001/api/health"
set /a READY_TIMEOUT=300

REM ---- Preflight -----------------------------------------------------------
where docker >nul 2>&1
if errorlevel 1 (
  echo.
  echo   Docker is not installed.
  echo.
  echo   Install Docker Desktop, then run this again:
  echo     https://www.docker.com/products/docker-desktop/
  echo.
  pause
  exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
  echo.
  echo   Docker is installed but not running.
  echo.
  echo   Open Docker Desktop, wait until it says "Running", then try again.
  echo.
  pause
  exit /b 1
)

docker compose version >nul 2>&1
if errorlevel 1 (
  echo.
  echo   Docker Compose is not available. Update Docker Desktop.
  echo.
  pause
  exit /b 1
)

REM ---- Subcommands ---------------------------------------------------------
if /i "%~1"=="--stop"  goto :stop
if /i "%~1"=="stop"    goto :stop
if /i "%~1"=="--logs"  goto :logs
if /i "%~1"=="logs"    goto :logs
if /i "%~1"=="--fresh" goto :fresh
if /i "%~1"=="fresh"   goto :fresh
if /i "%~1"=="--help"  goto :help
if /i "%~1"=="-h"      goto :help
if not "%~1"=="" (
  echo   Unknown option: %~1
  echo   Try: start_local.bat [--fresh^|--stop^|--logs^|--help]
  pause
  exit /b 1
)
goto :start

:stop
echo   Stopping FindMyArtisan...
docker compose down
echo   Stopped. Your data is kept - run start_local.bat to bring it back.
pause
exit /b 0

:logs
docker compose logs -f
exit /b 0

:help
echo.
echo   start_local.bat            start the app
echo   start_local.bat --fresh    wipe the database and reseed
echo   start_local.bat --stop     stop everything
echo   start_local.bat --logs     follow the logs
echo.
pause
exit /b 0

:fresh
echo   Wiping local data and rebuilding from scratch...
docker compose down -v
goto :start

REM ---- Start ---------------------------------------------------------------
:start
echo.
echo   Starting FindMyArtisan...
echo   First run takes a few minutes: it downloads PostgreSQL and compiles both apps.
echo.

docker compose up -d --build
if errorlevel 1 (
  echo.
  echo   Docker could not start the app. See what went wrong with:
  echo     start_local.bat --logs
  echo.
  pause
  exit /b 1
)

REM ---- Wait for readiness --------------------------------------------------
REM "up -d" returns once containers start, not once the app is usable: the API
REM still has to run migrations and seed the demo artisans.
echo.
echo   Waiting for the app to be ready...
set /a waited=0

:waitloop
curl -fsS -o nul "%APP_URL%" >nul 2>&1
if errorlevel 1 goto :notready
curl -fsS -o nul "%API_URL%" >nul 2>&1
if errorlevel 1 goto :notready
goto :ready

:notready
if !waited! GEQ %READY_TIMEOUT% (
  echo.
  echo   The app did not come up within %READY_TIMEOUT% seconds.
  echo   See what went wrong with:  start_local.bat --logs
  echo.
  pause
  exit /b 1
)
REM timeout.exe needs a console; ping is the portable sleep on Windows.
ping -n 4 127.0.0.1 >nul
set /a waited+=3
goto :waitloop

:ready
echo.
echo   ==========================================================
echo     FindMyArtisan is running.
echo.
echo     Open:  %APP_URL%
echo.
echo     Demo artisans are seeded around Ilaro (6.8886, 3.0225).
echo.
echo     Sign in with any of these (all use the same password):
echo       Admin    admin@findmyartisan.com        / admin123
echo       Artisan  brightspark@findmyartisan.com  / admin123
echo       Artisan  aquafix@findmyartisan.com      / admin123
echo.
echo     If the map says no artisans found, your browser location is
echo     not near Ilaro. On Find Services, choose "enter coordinates"
echo     and type 6.8886 and 3.0225.
echo.
echo     Stop it:     start_local.bat --stop
echo     Watch logs:  start_local.bat --logs
echo     Start over:  start_local.bat --fresh
echo   ==========================================================
echo.

start "" "%APP_URL%"
pause
exit /b 0
