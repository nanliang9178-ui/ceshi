import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStaffDto, ResetPasswordDto, UpdateStaffDto } from './dto';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.staffUser.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }

  async create(tenantId: string, dto: CreateStaffDto) {
    const exists = await this.prisma.staffUser.findFirst({
      where: { tenantId, username: dto.username.trim() },
    });
    if (exists) throw new BadRequestException('该账号已存在');

    const store = await this.prisma.store.findUnique({ where: { tenantId }, select: { id: true } });
    const staff = await this.prisma.staffUser.create({
      data: {
        tenantId,
        storeId: store?.id,
        username: dto.username.trim(),
        name: dto.name.trim(),
        role: dto.role || 'STAFF',
        passwordHash: await bcrypt.hash(dto.password, 10),
      },
      select: { id: true, username: true, name: true, role: true, status: true },
    });
    return staff;
  }

  async update(tenantId: string, id: string, dto: UpdateStaffDto) {
    const staff = await this.prisma.staffUser.findFirst({ where: { id, tenantId } });
    if (!staff) throw new NotFoundException('员工不存在');
    if (staff.role === 'OWNER' && dto.role && dto.role !== 'OWNER') {
      const owners = await this.prisma.staffUser.count({ where: { tenantId, role: 'OWNER', status: 'ACTIVE' } });
      if (owners <= 1) throw new BadRequestException('至少需要保留一名老板账号');
    }
    if (staff.role === 'OWNER' && dto.status === 'DISABLED') {
      const owners = await this.prisma.staffUser.count({ where: { tenantId, role: 'OWNER', status: 'ACTIVE' } });
      if (owners <= 1) throw new BadRequestException('不能停用唯一的老板账号');
    }
    return this.prisma.staffUser.update({
      where: { id },
      data: { name: dto.name?.trim(), role: dto.role, status: dto.status },
      select: { id: true, username: true, name: true, role: true, status: true },
    });
  }

  async resetPassword(tenantId: string, id: string, dto: ResetPasswordDto) {
    const staff = await this.prisma.staffUser.findFirst({ where: { id, tenantId } });
    if (!staff) throw new NotFoundException('员工不存在');
    await this.prisma.staffUser.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(dto.password, 10) },
    });
    return { success: true };
  }

  async remove(tenantId: string, id: string, currentStaffId: string) {
    if (id === currentStaffId) throw new BadRequestException('不能删除当前登录账号');
    const staff = await this.prisma.staffUser.findFirst({ where: { id, tenantId } });
    if (!staff) throw new NotFoundException('员工不存在');
    if (staff.role === 'OWNER') throw new BadRequestException('老板账号不可删除，请先转让身份');
    await this.prisma.staffUser.delete({ where: { id } });
    return { success: true };
  }
}
