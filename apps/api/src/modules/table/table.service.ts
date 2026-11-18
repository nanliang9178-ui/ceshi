import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { buildSceneCode } from '../../common/utils/order.util';
import { WechatService } from '../wechat/wechat.service';
import { BatchCreateTableDto, CreateTableDto, UpdateTableDto } from './dto';

@Injectable()
export class TableService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly wechat: WechatService,
  ) {}

  async list(tenantId: string) {
    const [tables, wx] = await Promise.all([
      this.prisma.diningTable.findMany({
        where: { tenantId },
        orderBy: [{ area: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.paymentConfig.findUnique({ where: { tenantId } }),
    ]);
    const areas = Array.from(new Set(tables.map((table) => table.area)));
    return {
      total: tables.length,
      areas,
      publicBaseUrl: (process.env.PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, ''),
      miniprogram: {
        configured: Boolean((wx?.appId || process.env.WECHAT_APP_ID) && wx?.appSecretEnc),
        envVersion: wx?.wxEnvVersion || 'release',
      },
      /** 网页版桌码：微信扫一扫即可在手机浏览器打开点单页，无需小程序 */
      list: tables.map((table) => ({
        ...table,
        qrContent: this.h5Url(table.sceneCode),
        h5Url: this.h5Url(table.sceneCode),
      })),
    };
  }

  private h5Url(sceneCode: string): string {
    const base = (process.env.PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
    return `${base}/t/${sceneCode}`;
  }

  private async storeIdOf(tenantId: string): Promise<string> {
    const store = await this.prisma.store.findUnique({ where: { tenantId }, select: { id: true } });
    if (!store) throw new NotFoundException('门店不存在');
    return store.id;
  }

  async create(tenantId: string, dto: CreateTableDto) {
    const storeId = await this.storeIdOf(tenantId);
    const exists = await this.prisma.diningTable.findFirst({
      where: { storeId, name: dto.name.trim() },
    });
    if (exists) throw new BadRequestException('该桌号已存在');

    const table = await this.prisma.diningTable.create({
      data: {
        tenantId,
        storeId,
        sceneCode: buildSceneCode(),
        name: dto.name.trim(),
        area: dto.area?.trim() || '大厅',
        seats: dto.seats ?? 4,
      },
    });
    await this.invalidate(tenantId);
    return table;
  }

  async batchCreate(tenantId: string, dto: BatchCreateTableDto) {
    const storeId = await this.storeIdOf(tenantId);
    const prefix = dto.prefix?.trim() || '';
    const names: string[] = [];
    for (let i = 0; i < dto.count; i += 1) {
      names.push(`${prefix}${String(dto.start + i).padStart(2, '0')}`);
    }

    const existing = await this.prisma.diningTable.findMany({
      where: { storeId, name: { in: names } },
      select: { name: true },
    });
    if (existing.length) {
      throw new BadRequestException(`桌号 ${existing.map((item) => item.name).join('、')} 已存在`);
    }

    await this.prisma.diningTable.createMany({
      data: names.map((name) => ({
        tenantId,
        storeId,
        sceneCode: buildSceneCode(),
        name,
        area: dto.area.trim(),
        seats: dto.seats ?? 4,
      })),
    });
    await this.invalidate(tenantId);
    return { success: true, created: names.length };
  }

  async update(tenantId: string, id: string, dto: UpdateTableDto) {
    await this.ensure(tenantId, id);
    const table = await this.prisma.diningTable.update({
      where: { id },
      data: { name: dto.name?.trim(), area: dto.area?.trim(), seats: dto.seats },
    });
    await this.invalidate(tenantId);
    return table;
  }

  async remove(tenantId: string, id: string) {
    await this.ensure(tenantId, id);
    await this.prisma.diningTable.delete({ where: { id } });
    await this.invalidate(tenantId);
    return { success: true };
  }

  private async ensure(tenantId: string, id: string) {
    const table = await this.prisma.diningTable.findFirst({ where: { id, tenantId } });
    if (!table) throw new NotFoundException('桌位不存在');
    return table;
  }

  /** 生成小程序码并落盘（同一桌位重复生成直接复用） */
  async generateQrCode(tenantId: string, id: string, force = false) {
    const table = await this.ensure(tenantId, id);
    if (table.qrCodeUrl && !force) return { qrCodeUrl: table.qrCodeUrl, mock: false };

    const buffer = await this.wechat.getUnlimitedQrCode(tenantId, table.sceneCode);

    const dir = join(process.cwd(), process.env.UPLOAD_DIR || 'uploads', 'qrcode', tenantId);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const filename = `${table.sceneCode}.png`;
    writeFileSync(join(dir, filename), buffer);
    const url = `/uploads/qrcode/${tenantId}/${filename}`;

    await this.prisma.diningTable.update({ where: { id }, data: { qrCodeUrl: url } });
    return { qrCodeUrl: url, mock: false };
  }

  async generateAll(tenantId: string, force = false) {
    const tables = await this.prisma.diningTable.findMany({ where: { tenantId } });
    if (!tables.length) throw new BadRequestException('还没有桌位，请先批量建桌');

    const results: Array<{ id: string; name: string; qrCodeUrl: string | null; mock: boolean }> = [];
    let firstError = '';
    for (const table of tables) {
      try {
        const result = await this.generateQrCode(tenantId, table.id, force);
        results.push({ id: table.id, name: table.name, qrCodeUrl: result.qrCodeUrl, mock: false });
      } catch (error) {
        if (!firstError) firstError = (error as Error).message;
        results.push({ id: table.id, name: table.name, qrCodeUrl: null, mock: true });
      }
    }
    if (results.every((item) => !item.qrCodeUrl)) {
      throw new BadRequestException(firstError || '小程序码生成失败');
    }
    return results;
  }

  private async invalidate(tenantId: string): Promise<void> {
    await this.cache.delByPrefix(`bootstrap:${tenantId}`);
  }
}
