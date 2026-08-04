# Builds the Vue client (web/) and bundles it as static files served by the
# Express/better-sqlite3 API (server/) - one process, one container. Build
# context must be the repo root: web/public/Images is a symlink to
# ../../Images, and the server's `dev` proxy setup doesn't apply here since
# there's no separate client server in production.

FROM node:24-alpine AS web-build
WORKDIR /repo
COPY web ./web
COPY Images ./Images
WORKDIR /repo/web
RUN npm ci
RUN npm run build

FROM node:24-alpine AS server-deps
# better-sqlite3 ships prebuilt binaries but npm still runs `node-gyp
# rebuild` by default for any package with a binding.gyp - give it a
# toolchain so that succeeds (it bundles its own sqlite3 source, no extra
# -dev libs needed).
RUN apk add --no-cache python3 make g++
WORKDIR /repo/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

FROM node:24-alpine AS runtime
ENV NODE_ENV=production \
    PORT=8787 \
    DRAGON_COURT_DB=/data/data.sqlite
WORKDIR /app
COPY --from=server-deps /repo/server/node_modules ./node_modules
COPY server/package.json ./
COPY server/src ./src
COPY --from=web-build /repo/web/dist ./public

RUN mkdir -p /data && chown -R node:node /data
VOLUME /data
USER node

EXPOSE 8787
CMD ["node", "src/index.js"]
