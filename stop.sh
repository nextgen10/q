#!/usr/bin/env bash
# ============================================================
#  Qualaris — Stop all platform services
# ============================================================
echo "Stopping Qualaris services..."

# Kill by port
lsof -ti :8000 | xargs kill -9 2>/dev/null && echo "  ✓ Backend (port 8000) stopped" || echo "  – Backend was not running"
lsof -ti :3000 | xargs kill -9 2>/dev/null && echo "  ✓ Frontend (port 3000) stopped" || echo "  – Frontend was not running"

echo "Done."
