FROM node:22-alpine
WORKDIR /app
COPY . .
ENV NODE_ENV=production PORT=3000
USER node
EXPOSE 3000
HEALTHCHECK --interval=60s --timeout=5s CMD wget -qO- http://localhost:3000/ >/dev/null || exit 1
CMD ["node", "server/server.js"]
