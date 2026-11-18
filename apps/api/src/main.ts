import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync, mkdirSync } from 'fs';
import { extname, join } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap(): Promise<void> {
  // rawBody: 微信支付回调需要原始报文做验签
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  const logger = new Logger('Bootstrap');

  const prefix = process.env.API_PREFIX || 'api';
  app.setGlobalPrefix(prefix.replace(/^\//, ''));

  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor(app.get(Reflector)));

  const uploadDir = join(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
  app.useStaticAssets(uploadDir, { prefix: '/uploads/' });

  // 网页版点单（顾客扫普通二维码直接打开）：构建产物挂到 /t，深链接回落到 index.html
  const h5Dir = process.env.H5_DIST_DIR
    ? join(process.cwd(), process.env.H5_DIST_DIR)
    : join(process.cwd(), '..', 'h5', 'dist');
  if (existsSync(h5Dir)) {
    app.useStaticAssets(h5Dir, { prefix: '/t/' });
    const server = app.getHttpAdapter().getInstance();
    server.use((req: any, res: any, next: any) => {
      if (req.method !== 'GET' || !req.path.startsWith('/t/') || extname(req.path)) return next();
      res.sendFile(join(h5Dir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`API 已启动: http://localhost:${port}/${prefix}`);
  logger.log(`静态资源: http://localhost:${port}/uploads`);
  if (existsSync(h5Dir)) {
    const base = (process.env.PUBLIC_BASE_URL || `http://localhost:${port}`).replace(/\/$/, '');
    logger.log(`网页版点单: ${base}/t/{桌位scene}`);
  } else {
    logger.warn(`未找到网页版产物 ${h5Dir}，请先执行 npm run build:h5`);
  }
}

void bootstrap();
