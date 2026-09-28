# Adventure Land Blockly Edition - one image for the web server, the game server and the seed job.
# Built by docker-compose.yml in the repository root; see deploy/README.md.
FROM node:22-bookworm-slim

WORKDIR /app

# The shared engine lives in its own repository (upstream symlinks it as ./common).
# Pinned so builds are repeatable; bump it when merging a newer upstream (see deploy/README.md).
ARG COMMON_ENGINE_REF=fa74fabf5d3782503712621e037bfb934ecb8439
ARG COMMON_ENGINE_URL=https://codeload.github.com/kaansoral/common_engine/tar.gz/${COMMON_ENGINE_REF}
RUN node -e 'fetch(process.argv[1]).then(async (r) => { if (!r.ok) throw new Error(r.status + " " + process.argv[1]); require("fs").writeFileSync("/tmp/common.tgz", Buffer.from(await r.arrayBuffer())); })' "$COMMON_ENGINE_URL" \
	&& mkdir common && tar -xzf /tmp/common.tgz -C common --strip-components=1 && rm /tmp/common.tgz \
	&& test -f common/init.js

# Dependencies first, so code changes don't reinstall them
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY node/package.json node/
RUN cd node && npm install --omit=dev --no-audit --no-fund

COPY . .

# Upstream keeps its config in a separate "secretsandconfig" repository; the classroom
# versions in deploy/config read everything from environment variables (the .env file).
RUN mkdir -p secretsandconfig && cp deploy/config/keys.js deploy/config/options.js secretsandconfig/

CMD ["node", "main.js"]
