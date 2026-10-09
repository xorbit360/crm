FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ git openssh-client

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build

EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "dist/server.js"]
