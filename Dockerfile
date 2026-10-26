FROM node:24-bookworm-slim AS prepared
WORKDIR /app
COPY package.json content.json VIDEO-ASSETS.json ./
COPY public ./public
COPY original ./original
COPY cloud ./cloud
COPY server ./server
COPY scripts ./scripts
COPY video-archive ./video-archive
COPY server.mjs ./
RUN node scripts/restore-videos.mjs

FROM node:24-bookworm-slim
ENV NODE_ENV=production TALACARD_MODE=self-hosted TALACARD_HOST=0.0.0.0 TALACARD_PORT=4187 TALACARD_DATA_DIR=/data
WORKDIR /app
COPY --from=prepared --chown=node:node /app/package.json /app/content.json /app/VIDEO-ASSETS.json /app/server.mjs ./
COPY --from=prepared --chown=node:node /app/public ./public
COPY --from=prepared --chown=node:node /app/original ./original
COPY --from=prepared --chown=node:node /app/server ./server
COPY --from=prepared --chown=node:node /app/cloud ./cloud
COPY --from=prepared --chown=node:node /app/scripts ./scripts
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 4187
CMD ["node","server.mjs"]
