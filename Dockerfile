# --- Build Stage ---
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies including devDependencies for compilation
RUN npm install --legacy-peer-deps

COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the TypeScript project
RUN npm run build

# Clean devDependencies
RUN npm prune --production

# --- Production Stage ---
FROM node:20-alpine

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/server.js"]
