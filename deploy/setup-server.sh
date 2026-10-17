#!/usr/bin/env bash
# ==============================================================================
# 404nfd Radio Automated Server Setup & Deployment Script
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo " Setting up 404nfd Radio on host system"
echo " Project root: $PROJECT_ROOT"
echo "=========================================="

# 1. Verify Node.js
if ! command -v node &>/dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js (version 20+ recommended)."
    exit 1
fi
echo "[1/4] Node.js version: $(node -v)"

# 2. Build Frontend SPA
echo "[2/4] Installing and building frontend..."
(
    cd "$PROJECT_ROOT/frontend"
    npm install
    npm run build
)

# 3. Build Backend
echo "[3/4] Installing and building backend..."
(
    cd "$PROJECT_ROOT/backend"
    npm install
    npm run build
)

# 4. Verify Configuration
echo "[4/4] Verifying configuration..."
if [ ! -f "$PROJECT_ROOT/backend/.env" ]; then
    if [ -f "$PROJECT_ROOT/.env" ]; then
        cp "$PROJECT_ROOT/.env" "$PROJECT_ROOT/backend/.env"
        echo "Copied root .env to backend/.env"
    elif [ -f "$PROJECT_ROOT/.env.example" ]; then
        cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/backend/.env"
        echo "Created backend/.env from .env.example. Please edit with real credentials if using Telegram Bot."
    fi
fi

# Ensure media directory exists
mkdir -p "$PROJECT_ROOT/backend/media"

echo "=========================================="
echo " 404nfd Radio build completed successfully!"
echo ""
echo " To run with systemd:"
echo "   sudo cp $SCRIPT_DIR/systemd/404nfd-radio.service /etc/systemd/system/"
echo "   sudo systemctl daemon-reload"
echo "   sudo systemctl enable --now 404nfd-radio"
echo ""
echo " To run with Docker Compose:"
echo "   docker compose up -d --build"
echo "=========================================="
