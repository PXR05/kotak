FROM oven/bun:latest AS builder

ENV BODY_SIZE_LIMIT=Infinity

WORKDIR /app

COPY . .

RUN bun i
RUN bun --bun run build

FROM oven/bun:latest

COPY --from=builder /app/build .
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

ENV NODE_ENV=production