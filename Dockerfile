# ============================================================
# 天枢点单 - 应用镜像（API + 管理后台静态文件）
# 构建：docker build -t tianshu-ordering:1.0.0 .
# 运行：docker run -d -p 3000:3000 --env-file apps/api/.env \
#        -v $(pwd)/data:/app/apps/api/data \
#        -v $(pwd)/uploads:/app/apps/api/uploads tianshu-ordering:1.0.0
# ============================================================
FROM node:22-alpine AS builder
WORKDIR /app

# 先复制依赖清单，充分利用构建缓存
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/admin/package.json ./apps/admin/
RUN npm ci

COPY . .
RUN npm run build:shared \
 && npm run build -w @tianshu/api \
 && npm run build -w @tianshu/admin \
 && cd apps/api && npx prisma generate

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache tzdata && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/admin/dist ./apps/admin/dist

WORKDIR /app/apps/api
RUN mkdir -p data uploads
EXPOSE 3000
CMD ["node", "dist/main.js"]
