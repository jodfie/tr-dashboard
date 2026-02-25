# Stage 1: Build static assets
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve with Caddy
FROM caddy:2-alpine
COPY --from=build /app/dist /var/www/html
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 80 443
