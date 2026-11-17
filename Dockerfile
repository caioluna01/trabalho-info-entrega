FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && mkdir -p /app/data && chown node:node /app/data
COPY --chown=node:node src ./src
COPY --chown=node:node scripts/ver-banco.js ./scripts/ver-banco.js
COPY --chown=node:node testes ./testes
ENV NODE_ENV=production PORT=3000 DATA_DIR=/app/data
USER node
EXPOSE 3000
CMD ["node", "src/server.js"]
