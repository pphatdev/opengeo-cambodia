# syntax=docker/dockerfile:1

ARG DENO_VERSION=2.9.8

# ---- Build: React web app, llms.txt files and sitemap ----
FROM denoland/deno:${DENO_VERSION} AS build
WORKDIR /app

COPY . .
RUN deno install && deno task build

# ---- Runtime: Deno API server serving the API, SPA and static files ----
FROM denoland/deno:${DENO_VERSION}
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

COPY --from=build --chown=deno:deno /app/deno.json ./
COPY --from=build --chown=deno:deno /app/src ./src
COPY --from=build --chown=deno:deno /app/public ./public
COPY --from=build --chown=deno:deno /app/dist/client ./dist/client
COPY --from=build --chown=deno:deno /app/llms.txt /app/llms-full.txt ./

# Cache only the npm packages the API imports (skips vite, wrangler and other build tooling)
ENV DENO_DIR=/deno-dir
RUN deno cache --node-modules-dir=none src/index.ts && chown -R deno:deno /app /deno-dir

USER deno
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD deno eval "const r = await fetch('http://127.0.0.1:' + (Deno.env.get('PORT') ?? '3000') + '/health'); Deno.exit(r.ok ? 0 : 1)"

CMD ["deno", "run", "--cached-only", "--node-modules-dir=none", "--allow-net", "--allow-read", "--allow-env", "src/index.ts"]
