FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY mock-brain-server.js ./

EXPOSE 8001

ENV PORT=8001
CMD ["node", "mock-brain-server.js"]
