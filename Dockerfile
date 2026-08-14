FROM node:18-alpine

WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

# Generate Prisma client for this platform
RUN npx prisma generate

# Copy all source files
COPY . .

# Build: esbuild → dist/server/index.js, vite → dist/index.html
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/server/index.js"]
