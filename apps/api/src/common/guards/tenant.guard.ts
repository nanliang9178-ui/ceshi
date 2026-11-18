import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../types';

/**
 * 商户状态校验：被停用 / 已过期的商户，后台一律拒绝写操作。
 * 平台账号（type=platform）直接放行。
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthUser | undefined;
    if (isPublic || !user) return true;
    if (user.type === 'platform') return true;
    if (!user.tenantId) throw new ForbiddenException('账号未绑定商户');

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { status: true, expireAt: true, name: true },
    });
    if (!tenant) throw new ForbiddenException('商户不存在');
    if (tenant.status !== 'ACTIVE') throw new ForbiddenException('商户已停用，请联系服务商');
    if (tenant.expireAt && tenant.expireAt.getTime() < Date.now()) {
      throw new ForbiddenException('服务已到期，请联系服务商续费');
    }
    (request as any).tenant = tenant;
    return true;
  }
}
