# =========================================================
# MIMETIC SOFT - IMAGEM DO BACK-END (servidorREST / API Node + Express)
# =========================================================
FROM node:22-alpine

WORKDIR /app

# Instala só as dependências de produção (usa o package-lock.json)
COPY package*.json ./
RUN npm ci --omit=dev

# Código da API
COPY . .

ENV PORT=3000
EXPOSE 3000

# Roda como usuário sem privilégios (boa prática de segurança)
USER node

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]
