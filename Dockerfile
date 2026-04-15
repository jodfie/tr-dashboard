# Stage 1: Build static assets
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve static files
FROM node:20-alpine
RUN npm install -g serve@14
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY serve.json .
COPY docker-entrypoint.sh .
RUN chmod +x docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
