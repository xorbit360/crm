FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++ git openssh-client ffmpeg chromium
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npx vite build || true
# Compilar el backend TypeScript a dist/server.js como modulo ESM
# (package.json tiene "type": "module"; el banner define __dirname/__filename por si el codigo los usa)
RUN npx esbuild server.ts --bundle --platform=node --format=esm --outfile=dist/server.js --packages=external --log-level=warning --banner:js="import{createRequire}from 'module';import{fileURLToPath}from 'url';import{dirname}from 'path';const require=createRequire(import.meta.url);const __filename=fileURLToPath(import.meta.url);const __dirname=dirname(__filename);"
EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production
CMD ["sh", "-c", "if [ -f dist/server.js ]; then node dist/server.js; else node server.js; fi"]
