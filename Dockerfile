# Multi-stage Docker build for full-stack Node.js + Vite deployment
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy package descriptors
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies for both parts
RUN npm install
RUN npm install --prefix backend
RUN npm install --prefix frontend

# Copy source code
COPY . .

# Compile the frontend assets to frontend/dist
RUN npm run build

# --- Production Environment ---
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

# Copy production artifacts
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/backend ./backend
COPY --from=builder /usr/src/app/frontend/dist ./frontend/dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/backend/node_modules ./backend/node_modules

EXPOSE 3001

ENV PORT=3001
ENV NODE_ENV=production

CMD ["npm", "start"]
