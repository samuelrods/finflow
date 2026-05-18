# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npx prisma generate --schema=prisma/schema.prisma
RUN npm run build


# Stage 2: Production
FROM node:20-alpine AS production

ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./
# Install production dependencies, prisma, and tsx for migrations
RUN npm ci --omit=dev && npm install prisma tsx

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 3001

# Run migrations and then start the application
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
