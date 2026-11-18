import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/types';
import { ChangePasswordDto, PlatformLoginDto, StaffLoginDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private async sign(user: AuthUser): Promise<{ token: string; user: AuthUser }> {
    const token = await this.jwt.signAsync(user);
    return { token, user };
  }

  async staffLogin(dto: StaffLoginDto) {
    const username = dto.username.trim();
    const where: any = { username, status: 'ACTIVE' };
    if (dto.tenantCode) {
      const tenant = await this.prisma.tenant.findUnique({ where: { code: dto.tenantCode.trim() } });
      if (!tenant) throw new UnauthorizedException('商户编码不存在');
      where.tenantId = tenant.id;
    }

    const staffList = await this.prisma.staffUser.findMany({
      where,
      include: { tenant: true },
      take: 3,
    });

    if (staffList.length === 0) throw new UnauthorizedException('账号或密码错误');
    if (staffList.length > 1) {
      throw new BadRequestException('该账号在多个商户下存在，请填写商户编码后登录');
    }

    const staff = staffList[0];
    const valid = await bcrypt.compare(dto.password, staff.passwordHash);
    if (!valid) throw new UnauthorizedException('账号或密码错误');

    const tenant = staff.tenant;
    if (tenant.status !== 'ACTIVE') throw new ForbiddenException('商户已停用，请联系服务商');
    if (tenant.expireAt && tenant.expireAt.getTime() < Date.now()) {
      throw new ForbiddenException('服务已到期，请联系服务商续费');
    }

    await this.prisma.staffUser.update({ where: { id: staff.id }, data: { lastLoginAt: new Date() } });

    return this.sign({
      sub: staff.id,
      type: 'staff',
      tenantId: staff.tenantId,
      storeId: staff.storeId || undefined,
      role: staff.role,
      name: staff.name,
      username: staff.username,
    });
  }

  async platformLogin(dto: PlatformLoginDto) {
    const user = await this.prisma.platformUser.findUnique({ where: { username: dto.username.trim() } });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('账号或密码错误');
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('账号或密码错误');
    await this.prisma.platformUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return this.sign({
      sub: user.id,
      type: 'platform',
      role: 'PLATFORM',
      name: user.name,
      username: user.username,
    });
  }

  async me(user: AuthUser) {
    if (user.type === 'platform') {
      const account = await this.prisma.platformUser.findUnique({ where: { id: user.sub } });
      return {
        type: 'platform',
        name: account?.name || user.name,
        username: account?.username,
        role: user.role,
        tenant: null,
        brand: null,
        store: null,
      };
    }

    const staff = await this.prisma.staffUser.findUnique({
      where: { id: user.sub },
      include: {
        tenant: { include: { brand: true, store: true } },
      },
    });
    if (!staff) throw new UnauthorizedException('账号不存在');
    return {
      type: 'staff',
      name: staff.name,
      username: staff.username,
      role: staff.role,
      tenant: staff.tenant
        ? {
            id: staff.tenant.id,
            code: staff.tenant.code,
            name: staff.tenant.name,
            status: staff.tenant.status,
            plan: staff.tenant.plan,
            expireAt: staff.tenant.expireAt,
          }
        : null,
      brand: staff.tenant?.brand || null,
      store: staff.tenant?.store || null,
    };
  }

  async changePassword(user: AuthUser, dto: ChangePasswordDto) {
    if (user.type === 'platform') {
      const account = await this.prisma.platformUser.findUnique({ where: { id: user.sub } });
      if (!account) throw new UnauthorizedException('账号不存在');
      const valid = await bcrypt.compare(dto.oldPassword, account.passwordHash);
      if (!valid) throw new BadRequestException('原密码不正确');
      await this.prisma.platformUser.update({
        where: { id: account.id },
        data: { passwordHash: await bcrypt.hash(dto.newPassword, 10) },
      });
      return { success: true };
    }

    const staff = await this.prisma.staffUser.findUnique({ where: { id: user.sub } });
    if (!staff) throw new UnauthorizedException('账号不存在');
    const valid = await bcrypt.compare(dto.oldPassword, staff.passwordHash);
    if (!valid) throw new BadRequestException('原密码不正确');
    await this.prisma.staffUser.update({
      where: { id: staff.id },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, 10) },
    });
    return { success: true };
  }
}
