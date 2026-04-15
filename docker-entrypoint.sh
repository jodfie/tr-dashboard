#!/bin/sh
set -e

cat > /app/dist/config.js <<EOF
window.__env = {
  VITE_API_BASE: "${VITE_API_BASE}"
};
EOF

exec serve
