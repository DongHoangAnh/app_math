FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production=false

COPY server/ ./server/
COPY shared/ ./shared/
COPY tsconfig.json ./

EXPOSE 3000

CMD ["npx", "tsx", "server/index.ts"]
