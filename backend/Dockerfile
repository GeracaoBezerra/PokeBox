FROM node:24-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && exec node --import ./dist/instrumentation.js dist/server.js"]

FROM node:24-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=dev /app/dist ./dist
COPY --from=dev /app/prisma ./prisma
COPY --from=dev /app/prisma.config.ts ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=5 CMD wget -qO- http://127.0.0.1:${PORT:-3000}/health > /dev/null || exit 1
CMD ["sh", "-c", "npx prisma migrate deploy && exec node --import ./dist/instrumentation.js dist/server.js"]
