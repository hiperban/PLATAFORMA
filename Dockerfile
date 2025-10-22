# ---------- deps: instala dependências p/ compilar ----------
FROM node:20-bookworm-slim AS deps
WORKDIR /app

# SSL certs (evita erros de fetch)
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copia manifestos e instala (usa npm install em vez de npm ci)
COPY package.json package-lock.json* ./
# Instala com devDependencies porque o build precisa de tailwind/postcss/etc.
RUN npm install

# ---------- builder: compila Next e gera standalone ----------
FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Reaproveita node_modules já instalados
COPY --from=deps /app/node_modules ./node_modules
# Copia todo o projeto
COPY . .
# Build clássico (não turbopack) para gerar .next/standalone
RUN npm run build

# ---------- runner: imagem final mínima ----------
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# Copia só o que precisa para rodar
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 8080
CMD ["node", "server.js"]
