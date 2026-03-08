#!/usr/bin/env bash
# ============================================================
#  Qualaris — Unified Platform Startup Script
#  Starts all services needed for the full production stack:
#    1. Qualaris backend  (FastAPI — includes all module APIs) → port 8000
#    2. Qualaris frontend (Next.js — all 4 UI modules)        → port 3000
# ============================================================

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Colors ──────────────────────────────────────────────────
RED='\033[0;31m'
GRN='\033[0;32m'
YEL='\033[1;33m'
BLD='\033[1m'
RST='\033[0m'

echo ""
echo -e "${BLD}╔══════════════════════════════════════════════════════╗${RST}"
echo -e "${BLD}║          QUALARIS — Unified Platform Startup          ║${RST}"
echo -e "${BLD}╚══════════════════════════════════════════════════════╝${RST}"
echo ""

# ── Validate Python environment ─────────────────────────────
BACKEND_DIR="$ROOT_DIR/backend"
if [ ! -f "$BACKEND_DIR/main.py" ]; then
  echo -e "${RED}✗  ERROR: backend/main.py not found. Aborting.${RST}"
  exit 1
fi

# ── Validate Node/npm ────────────────────────────────────────
if ! command -v npm &>/dev/null; then
  echo -e "${RED}✗  ERROR: npm not found. Install Node.js ≥18 and retry.${RST}"
  exit 1
fi

# ── 1. Start FastAPI backend (port 8000) ────────────────────
echo -e "${YEL}▶  Starting Qualaris backend on :8000 ...${RST}"
cd "$BACKEND_DIR"

# Activate virtual env if present
if [ -f "$BACKEND_DIR/.venv/bin/activate" ]; then
  source "$BACKEND_DIR/.venv/bin/activate"
elif [ -f "$ROOT_DIR/.venv/bin/activate" ]; then
  source "$ROOT_DIR/.venv/bin/activate"
fi

python3 -m uvicorn main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --reload \
  --log-level info &
BACKEND_PID=$!
echo -e "   ${GRN}PID: $BACKEND_PID${RST}"

# ── 2. Start Next.js frontend (port 3000) ───────────────────
echo -e "${YEL}▶  Starting Qualaris frontend on :3000 ...${RST}"
cd "$ROOT_DIR"
npm run dev &
FRONTEND_PID=$!
echo -e "   ${GRN}PID: $FRONTEND_PID${RST}"

echo ""
echo -e "────────────────────────────────────────────────────────"
echo -e "  ${BLD}All services are starting. Open in your browser:${RST}"
echo -e "  →  Qualaris UI         ${GRN}http://localhost:3000${RST}"
echo -e "  →  Swagger / API docs  ${GRN}http://localhost:8000/docs${RST}"
echo -e "  →  ReDoc               ${GRN}http://localhost:8000/redoc${RST}"
echo -e "────────────────────────────────────────────────────────"
echo -e "  Press ${BLD}Ctrl+C${RST} to stop all services."
echo ""

# ── Graceful shutdown ────────────────────────────────────────
cleanup() {
  echo ""
  echo -e "${YEL}Stopping all Qualaris services...${RST}"
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  echo -e "${GRN}All services stopped.${RST}"
  exit 0
}
trap cleanup INT TERM

wait "$BACKEND_PID" "$FRONTEND_PID"
