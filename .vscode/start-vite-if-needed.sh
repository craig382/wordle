#!/usr/bin/env bash
set -euo pipefail
HOST=127.0.0.1
PORT=5173
URL="http://${HOST}:${PORT}/wordle/"

if nc -z "$HOST" "$PORT" >/dev/null 2>&1; then
  echo "Vite is already running at ${URL}"
  exit 0
fi

echo "Starting Vite..."
npm run dev
