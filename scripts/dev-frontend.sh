#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -f "$ROOT_DIR/.env" ]]; then
    # shellcheck disable=SC1091
    source "$ROOT_DIR/.env"
fi

command -v npm >/dev/null || {
    echo "npm not found. Install Node.js before running this script." >&2
    exit 1
}

cd "$ROOT_DIR/frontend/web"

if [[ ! -d node_modules ]]; then
    echo "Installing web dependencies..."
    npm install
fi

exec npm run dev -- --host --port 5173
