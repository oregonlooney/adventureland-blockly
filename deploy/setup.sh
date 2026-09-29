#!/usr/bin/env bash
# Creates the .env file for docker-compose.yml: the address students will use and random secret keys.
# Usage: ./deploy/setup.sh            (asks for the address)
#        ./deploy/setup.sh 192.168.1.50
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then
	echo ".env already exists, keeping it. Delete it and run this again to start over."
	exit 0
fi

secret() {
	if command -v openssl >/dev/null; then openssl rand -hex 20; else head -c 20 /dev/urandom | od -An -tx1 | tr -d ' \n'; fi
}

detected=$(hostname -I 2>/dev/null | awk '{print $1}')
host=${1:-}
if [ -z "$host" ]; then
	read -rp "Address students will type in their browser (IP or hostname) [${detected:-localhost}]: " host
fi
host=${host:-${detected:-localhost}}
host=${host#http://}
host=${host%%/*}

cat > .env <<ENV
# Adventure Land classroom server settings (read by docker-compose.yml). Keep this file private.

# The IP address or hostname students use to reach this server
PUBLIC_HOST=$host
# Website port (students open http://PUBLIC_HOST, or http://PUBLIC_HOST:WEB_PORT if it isn't 80)
WEB_PORT=80
# Game server port, browsers connect to it directly
GAME_PORT=7192
# Characters online at once from one IP address. To go above 3, also run:
#   docker compose exec web node deploy/scripts/classroom.js allow-ip <address>
IP_LIMIT=3

# Game events to switch off, comma-separated (empty = none). "anniversary" is the event that asks
# players to find a featured player and send them a kiss. Others: halloween, valentines, holidayseason,
# lunarnewyear, goobrawl, crabxx, abtesting, icegolem, franky
DISABLED_EVENTS=anniversary

# Secret keys shared by the web and game servers. Don't share them.
ACCESS_MASTER=$(secret)
SERVER_MASTER=$(secret)
BOT_MASTER=$(secret)

# Uncomment if MongoDB fails to start because the CPU has no AVX support
# MONGO_IMAGE=mongo:4.4
ENV
chmod 600 .env
echo "Wrote .env for http://$host"
echo "Next: docker compose up -d --build"
