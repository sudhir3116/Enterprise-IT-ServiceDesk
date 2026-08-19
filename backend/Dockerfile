# Production Node.js Container Spec
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 8001

ENV NODE_ENV=production

CMD ["node", "server.js"]
