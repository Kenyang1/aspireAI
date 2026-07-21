# AspireAI — Next.js app image.
# Build:  docker build -t aspireai .
# Run:    docker run -p 3000:3000 --env-file .env aspireai
# (docker-compose.yml wires this together with Postgres, Qdrant, and Redis.)

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY package.json next.config.mjs ./
COPY public ./public
COPY scripts ./scripts
COPY src/data ./src/data

EXPOSE 3000
CMD ["npm", "run", "start"]
