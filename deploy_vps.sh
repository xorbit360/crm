#!/bin/bash
set -e

echo "=== [1/4] Preparando directorio de despliegue ==="
mkdir -p /docker/crm-xorbit
cd /docker/crm-xorbit

echo "=== [2/4] Creando Dockerfile para CRM (Node 22) ==="
cat << 'EOF' > /docker/crm-xorbit/app/Dockerfile
FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ git

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

RUN npx vite build || true

EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

CMD ["sh", "-c", "if [ -f dist/server.js ]; then node dist/server.js; else node server.js; fi"]
EOF

echo "=== [3/4] Creando docker-compose.yml con Traefik SSL ==="
cat << 'EOF' > /docker/crm-xorbit/docker-compose.yml
version: '3.8'

services:
  crm:
    build:
      context: ./app
      dockerfile: Dockerfile
    container_name: crm-web-1
    restart: always
    ports:
      - "32850:3000"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.crm.rule=Host(`crm.xorbit360.com`)"
      - "traefik.http.routers.crm.entrypoints=websecure"
      - "traefik.http.routers.crm.tls.certresolver=letsencrypt"
      - "traefik.http.services.crm.loadbalancer.server.port=3000"
      - "traefik.http.routers.crm-http.rule=Host(`crm.xorbit360.com`)"
      - "traefik.http.routers.crm-http.entrypoints=web"
EOF

echo "=== [4/4] Levantando contenedor con Docker Compose ==="
cd /docker/crm-xorbit
docker compose down || true
docker compose up -d --build

echo "=== DESPLIEGUE FINALIZADO ==="
docker ps | grep crm-web-1
