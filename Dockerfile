# KKTC TÜFE API - Dockerfile (Production Ready)
FROM node:22-alpine AS runner

WORKDIR /app

# Sistem saat dilimini ayarla
ENV TZ=UTC
RUN apk add --no-cache tzdata

# Paket bağımlılıklarını kopyala ve yükle
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Kaynak kodları ve başlangıç verilerini kopyala
COPY src/ ./src/
COPY data/ ./data/

# Düşük yetkili node kullanıcısına geç
RUN chown -R node:node /app
USER node

# Ortam değişkenleri varsayılanları
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

EXPOSE 3000

# Sağlık kontrolü
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

CMD ["node", "src/server.js"]
