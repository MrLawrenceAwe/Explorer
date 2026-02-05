#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-8787}"
PATH_SUFFIX="${2:-/sse}"

if ! command -v ngrok >/dev/null 2>&1; then
  echo "ngrok is not installed. Install it from https://ngrok.com/download and try again."
  exit 1
fi

echo "Starting ngrok tunnel to http://localhost:${PORT}"
ngrok http "${PORT}"

echo "\nOnce ngrok is running, use the HTTPS URL it prints, plus this path: ${PATH_SUFFIX}"
