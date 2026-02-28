#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -d "$ROOT_DIR/.venv" ]]; then
    # shellcheck disable=SC1091
    source "$ROOT_DIR/.venv/bin/activate"
fi

if [[ -f "$ROOT_DIR/.env" ]]; then
    # shellcheck disable=SC1091
    source "$ROOT_DIR/.env"
fi

if [[ -z "${OPENAI_API_KEY:-}" ]]; then
    read -rsp "Enter OPENAI_API_KEY: " OPENAI_API_KEY
    echo
    if [[ -z "${OPENAI_API_KEY:-}" ]]; then
        echo "OPENAI_API_KEY is required to start the backend." >&2
        exit 1
    fi
fi

command -v uvicorn >/dev/null || {
    echo "uvicorn not found. Install Python deps with: pip install -r requirements.txt" >&2
    exit 1
}

export OPENAI_API_KEY
export EXPLORER_DISABLE_STORAGE="${EXPLORER_DISABLE_STORAGE:-1}"

cd "$ROOT_DIR"
exec uvicorn backend.api.main:app --reload --port 8000
