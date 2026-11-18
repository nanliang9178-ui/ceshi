import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * 统一错误响应：{ code, message, data: null }
 * 把 Prisma 常见错误翻译成商家能看懂的话，避免把技术栈暴露给前端。
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器开小差了，请稍后重试';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (res && typeof res === 'object') {
        const body = res as Record<string, unknown>;
        const rawMessage = body.message;
        message = Array.isArray(rawMessage) ? String(rawMessage[0]) : String(rawMessage ?? exception.message);
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = '数据已存在，请勿重复提交';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = '数据不存在或已被删除';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = '存在关联数据，无法完成操作';
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          message = '数据处理失败，请检查输入内容';
      }
    } else if (exception instanceof Error) {
      this.logger.error(`${request.method} ${request.url} -> ${exception.message}`, exception.stack);
    }

    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url} ${status} ${message}`);
    }

    if (response.headersSent) return;
    response.status(status).json({ code: status, message, data: null });
  }
}
