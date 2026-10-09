FROM node:22-alpine AS build

WORKDIR /app

RUN apk add --no-cache python3 make g++ git openssh-client

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app

RUN apk add --no-cache git openssh-client tini

COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps && npm cache clean --force

COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/menu_data.json ./menu_data.json
COPY --from=build --chown=node:node /app/uploads ./uploads

RUN chown -R node:node /app

EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

USER node

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]
