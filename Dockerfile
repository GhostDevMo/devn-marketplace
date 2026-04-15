FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev=false

COPY . .
RUN npm run build

EXPOSE 5050
ENV NODE_ENV=production

CMD ["npm", "run", "start"]
