import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators';
import { AuthUser } from '../types';

const ROLE_WEIGHT: Record<string, number> = {
  SUPER_ADMIN: 100,
  PLATFORM: 90,
  OWNER: 50,
  MANAGER: 30,
  STAFF: 10,
  CUSTOMER: 1,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest().user as AuthUser | undefined;
    if (!user) throw new ForbiddenException('无权访问');
    if (user.type === 'platform') return true;

    const weight = ROLE_WEIGHT[user.role] ?? 0;
    const passed = required.some((role) => {
      if (role === user.role) return true;
      return weight >= (ROLE_WEIGHT[role] ?? 999);
    });
    if (!passed) throw new ForbiddenException('当前账号没有该操作权限');
    return true;
  }
}
