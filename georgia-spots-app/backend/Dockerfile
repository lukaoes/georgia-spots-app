# Multi-stage build: compile TypeScript in a full build environment, then copy just the
# compiled output + production dependencies into a smaller final image.

FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production

# better-sqlite3 is a native module. Its install script normally downloads a prebuilt binary
# for this exact platform, so build tools usually aren't needed - but if that ever fails on your
# server's specific setup, uncomment the line below to compile from source instead.
# RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist

EXPOSE 4000
CMD ["node", "dist/index.js"]
