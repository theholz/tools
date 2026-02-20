FROM node:22-alpine
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install
COPY src/ ./src/
RUN npx tsc
EXPOSE 8085
HEALTHCHECK --interval=30s --timeout=5s CMD wget -q --spider http://localhost:8085/health || exit 1
CMD ["node", "dist/index.js"]
