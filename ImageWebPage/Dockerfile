# syntax=docker/dockerfile:1
FROM node:20-slim
# curl is required by the Compose healthcheck; node:20-slim does not ship it.
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
