#!/usr/bin/env bash
#
# FindMyArtisan — start the whole app on this machine.
#
#   ./start_local.sh          build if needed, start, wait until ready
#   ./start_local.sh --fresh  wipe the database first and reseed
#   ./start_local.sh --stop   stop everything
#   ./start_local.sh --logs   follow the logs
#
# Nothing here touches the live site or the hosted database.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

APP_URL="http://localhost:3000"
API_URL="http://localhost:5001/api/health"
READY_TIMEOUT=300   # seconds; the first build pulls images and compiles both apps

bold()  { printf '\033[1m%s\033[0m\n' "$1"; }
dim()   { printf '\033[2m%s\033[0m\n' "$1"; }
good()  { printf '\033[32m%s\033[0m\n' "$1"; }
bad()   { printf '\033[31m%s\033[0m\n' "$1" >&2; }

# ── Preflight ────────────────────────────────────────────────────────────────
if ! command -v docker >/dev/null 2>&1; then
  bad "Docker is not installed."
  echo
  echo "Install Docker Desktop, then run this script again:"
  echo "  https://www.docker.com/products/docker-desktop/"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  bad "Docker is installed but not running."
  echo
  echo "Open Docker Desktop, wait for it to say \"Running\", then try again."
  exit 1
fi

# `docker compose` (v2, built in) with a fallback to the older `docker-compose`
if docker compose version >/dev/null 2>&1; then
  DC=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  DC=(docker-compose)
else
  bad "Docker Compose is not available."
  echo "Update Docker Desktop — Compose ships with it."
  exit 1
fi

# ── Subcommands ──────────────────────────────────────────────────────────────
case "${1:-}" in
  --stop|stop)
    bold "Stopping FindMyArtisan..."
    "${DC[@]}" down
    good "Stopped. Your data is kept — run ./start_local.sh to bring it back."
    exit 0
    ;;
  --logs|logs)
    exec "${DC[@]}" logs -f
    ;;
  --fresh|fresh)
    bold "Wiping local data and rebuilding from scratch..."
    "${DC[@]}" down -v
    ;;
  --help|-h|help)
    sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
    exit 0
    ;;
  "")
    ;;
  *)
    bad "Unknown option: $1"
    echo "Try: ./start_local.sh [--fresh|--stop|--logs|--help]"
    exit 1
    ;;
esac

# ── Port check ───────────────────────────────────────────────────────────────
# A port already in use is the most common failure, and Docker's own error for
# it is cryptic. Say so plainly before spending minutes on a build.
port_busy() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
  else
    return 1
  fi
}

for port in 3000 5001; do
  if port_busy "$port" && ! "${DC[@]}" ps --status running 2>/dev/null | grep -q .; then
    bad "Port $port is already in use by another program."
    echo
    echo "Close whatever is using it, or find it with:"
    echo "  lsof -nP -iTCP:$port -sTCP:LISTEN"
    exit 1
  fi
done

# ── Start ────────────────────────────────────────────────────────────────────
bold "Starting FindMyArtisan..."
dim  "First run takes a few minutes: it downloads PostgreSQL and compiles both apps."
echo

"${DC[@]}" up -d --build

# ── Wait for readiness ───────────────────────────────────────────────────────
# `up -d` returns once containers start, not once the app is usable. The API
# still has to run its migrations and seed the sample artisans.
echo
printf 'Waiting for the app to be ready'
elapsed=0
until curl -fsS "$APP_URL" >/dev/null 2>&1 && curl -fsS "$API_URL" >/dev/null 2>&1; do
  if [ "$elapsed" -ge "$READY_TIMEOUT" ]; then
    echo
    bad "The app did not come up within ${READY_TIMEOUT}s."
    echo
    echo "See what went wrong with:"
    echo "  ./start_local.sh --logs"
    exit 1
  fi
  printf '.'
  sleep 3
  elapsed=$((elapsed + 3))
done
echo

# ── Report ───────────────────────────────────────────────────────────────────
artisans=$(curl -fsS "http://localhost:5001/api/providers/nearby?latitude=6.8886&longitude=3.0225&radius=25" 2>/dev/null \
  | grep -o '"id"' | wc -l | tr -d ' ')

echo
good "FindMyArtisan is running."
echo
bold "  Open:  $APP_URL"
echo
echo "  Demo artisans loaded: ${artisans:-0} (around Ilaro — 6.8886, 3.0225)"
echo
echo "  Sign in with any of these (all use the same password):"
echo "    Admin    admin@findmyartisan.com        / admin123"
echo "    Artisan  brightspark@findmyartisan.com  / admin123"
echo "    Artisan  aquafix@findmyartisan.com      / admin123"
echo
dim  "  Location: the browser will ask to share it. If you decline, or you are"
dim  "  not near Ilaro, use \"enter coordinates\" on Find Services and type"
dim  "  6.8886 / 3.0225 to see the demo artisans."
echo
dim  "  Stop it:     ./start_local.sh --stop"
dim  "  Watch logs:  ./start_local.sh --logs"
dim  "  Start over:  ./start_local.sh --fresh"
echo

# Open the browser on macOS / Linux, best effort.
if command -v open >/dev/null 2>&1; then
  open "$APP_URL" >/dev/null 2>&1 || true
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open "$APP_URL" >/dev/null 2>&1 || true
fi
