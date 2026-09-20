#!/usr/bin/env bash
set -euo pipefail

echo "Running start-vite-if-needed.sh..."

HOST=127.0.0.1
PORT=5173
URL="http://${HOST}:${PORT}/wordle/"

echo "bash was using the following node --version:"
node --version

# Set NODE_VERSION equal the "node --version" 
# command response from an outside terminal.
NODE_VERSION="v24.21.0"
echo "NODE_VERESION = ${NODE_VERSION}"
export PATH=$HOME/.nvm/versions/node/$NODE_VERSION/bin:$PATH
echo "now bash is using the following node --version:"
node --version

if nc -z "$HOST" "$PORT" >/dev/null 2>&1; then
  echo "Vite is already running at ${URL}"
else
  echo "Starting Vite..."
  npm run dev
fi

echo "Executed start-vite-if-needed.sh."
exit 0
