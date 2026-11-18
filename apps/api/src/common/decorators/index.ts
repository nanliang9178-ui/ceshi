import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { AuthUser } from '../types';

export const IS_PUBLIC_KEY = 'isPublic';
/** 标记无需登录即可访问的接口 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
/** 角色权限，平台运营使用 PLATFORM */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const SKIP_TRANSFORM_KEY = 'skipTransform';
/** 跳过统一响应包装（微信支付回调等第三方接口） */
export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM_KEY, true);

export const CurrentUser = createParamDecorator((data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user as AuthUser;
  if (!user) return undefined;
  return data ? user[data] : user;
});

export const TenantId = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return (request.user as AuthUser)?.tenantId;
});

export const ClientIp = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) return forwarded.split(',')[0].trim();
  return request.ip;
});
