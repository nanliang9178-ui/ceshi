import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';

export class H5LoginDto {
  @IsString()
  @IsNotEmpty({ message: '缺少设备标识' })
  @MaxLength(64)
  clientId: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  tenantCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  scene?: string;
}

/**
 * 网页版（H5）顾客会话
 * 没有小程序/公众号时，用浏览器本地生成的 clientId 作为顾客身份，
 * 拿到的 token 与小程序登录完全一致，可直接复用 /client/* 接口。
 */
@Injectable()
export class H5Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private async resolveTenant(tenantCode?: string, scene?: string) {
    if (scene) {
      const table = await this.prisma.diningTable.findUnique({ where: { sceneCode: scene } });
      if (table) {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: table.tenantId } });
        if (tenant) return { tenant, table };
      }
      // 带了 scene 但查不到桌位：说明桌码失效，不能再兜底到默认商户
      throw new BadRequestException('桌码已失效，请重新扫描桌面二维码或联系店员');
    }
    const code = tenantCode || process.env.DEFAULT_TENANT_CODE;
    if (!code) throw new BadRequestException('缺少商户编码');
    const tenant = await this.prisma.tenant.findUnique({ where: { code } });
    if (!tenant) throw new NotFoundException('门店不存在，请重新扫码');
    return { tenant, table: null };
  }

  async login(dto: H5LoginDto) {
    const clientId = (dto.clientId || '').trim();
    if (!clientId || clientId.length < 8) throw new BadRequestException('设备标识无效，请刷新页面重试');

    const { tenant, table } = await this.resolveTenant(dto.tenantCode, dto.scene);
    if (tenant.status !== 'ACTIVE') throw new BadRequestException('门店暂停营业，请联系商家');

    const openid = `h5_${clientId}`.slice(0, 64);
    const customer = await this.prisma.customer.upsert({
      where: { tenantId_openid: { tenantId: tenant.id, openid } },
      update: { lastLoginAt: new Date() },
      create: {
        tenantId: tenant.id,
        openid,
        nickname: '网页顾客',
        lastLoginAt: new Date(),
      },
    });

    const token = await this.jwt.signAsync({
      sub: customer.id,
      type: 'customer',
      tenantId: tenant.id,
      role: 'CUSTOMER',
      name: customer.nickname || '顾客',
    });

    return {
      token,
      channel: 'h5',
      tenant: { id: tenant.id, code: tenant.code, name: tenant.name },
      table: table ? { id: table.id, name: table.name, area: table.area, sceneCode: table.sceneCode } : null,
      customer: { id: customer.id, nickname: customer.nickname, phone: customer.phone },
    };
  }
}
