#!/bin/sh
# Throwaway Home Assistant with the demo integration, for developing against. Then: node dev/seed.mjs
set -e
cd "$(dirname "$0")"
docker rm -f hahomeview-demo-ha >/dev/null 2>&1 || true
docker run -d --name hahomeview-demo-ha -p 8123:8123 -v "$PWD/ha:/config" ghcr.io/home-assistant/home-assistant:stable
echo "HA starting at http://localhost:8123 (first boot takes a minute). Then run: node dev/seed.mjs"
