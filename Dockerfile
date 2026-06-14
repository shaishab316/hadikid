FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@10.20.0 && pnpm install --frozen-lockfile --node-linker=hoisted

COPY . .

ENV DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy

RUN npx prisma generate
RUN npx nest build

FROM node:22-alpine

RUN npm install -g pnpm@10.20.0

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod --shamefully-hoist

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000

CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/src/main"]