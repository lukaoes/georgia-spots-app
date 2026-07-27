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

# The photo watermark is drawn by converting an SVG (with a <text> element) into a raster image
# via sharp/libvips, which under the hood uses librsvg + pango + fontconfig to actually render
# text glyphs. A bare bookworm-slim image has no fonts installed at all, so with nothing to draw
# the letters with, it silently renders empty boxes ("tofu") instead of the watermark text.
# fonts-dejavu-core is small and covers Latin characters, which is all the watermark needs.
RUN apt-get update \
  && apt-get install -y --no-install-recommends fontconfig fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*

# better-sqlite3 is a native module. Its install script normally downloads a prebuilt binary
# for this exact platform, so build tools usually aren't needed - but if that ever fails on your
# server's specific setup, uncomment the line below to compile from source instead.
# RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist

EXPOSE 4000
CMD ["node", "dist/index.js"]
