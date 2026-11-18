import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { UpdateBrandDto, UpdateStoreDto } from './dto';

@Injectable()
export class StoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getStore(tenantId: string) {
    const store = await this.prisma.store.findUnique({ where: { tenantId } });
    if (!store) throw new NotFoundException('门店不存在');
    return store;
  }

  async getBrand(tenantId: string) {
    const brand = await this.prisma.tenantBrand.findUnique({ where: { tenantId } });
    if (!brand) throw new NotFoundException('品牌配置不存在');
    return { ...brand, banners: this.parseBanners(brand.banners) };
  }

  private parseBanners(raw: string): Array<{ url: string; link?: string }> {
    try {
      const list = JSON.parse(raw || '[]');
      return Array.isArray(list) ? list.filter((item) => item && item.url) : [];
    } catch {
      return [];
    }
  }

  async updateStore(tenantId: string, dto: UpdateStoreDto) {
    const store = await this.prisma.store.update({
      where: { tenantId },
      data: {
        name: dto.name,
        address: dto.address,
        phone: dto.phone,
        businessHours: dto.businessHours,
        openStatus: dto.openStatus,
        autoAccept: dto.autoAccept,
        packingFee: dto.packingFee,
        minOrderAmount: dto.minOrderAmount,
        deliveryFee: dto.deliveryFee,
        deliveryMinAmount: dto.deliveryMinAmount,
        deliveryRange: dto.deliveryRange,
        deliveryEta: dto.deliveryEta,
        fullReduceThreshold: dto.fullReduceThreshold,
        fullReduceAmount: dto.fullReduceAmount,
        notice: dto.notice,
      },
    });
    await this.cache.delByPrefix(`bootstrap:${tenantId}`);
    return store;
  }

  async updateBrand(tenantId: string, dto: UpdateBrandDto) {
    if (dto.primaryColor && dto.primaryColor.toLowerCase() === (dto.accentColor || '').toLowerCase()) {
      throw new BadRequestException('主题色与辅助色不能相同');
    }
    const data: Record<string, unknown> = {
      logoUrl: dto.logoUrl,
      coverUrl: dto.coverUrl,
      primaryColor: dto.primaryColor,
      accentColor: dto.accentColor,
      slogan: dto.slogan,
      announcement: dto.announcement,
      servicePhone: dto.servicePhone,
      copyright: dto.copyright,
    };
    if (dto.banners) data.banners = JSON.stringify(dto.banners);
    Object.keys(data).forEach((key) => data[key] === undefined && delete data[key]);

    const brand = await this.prisma.tenantBrand.update({ where: { tenantId }, data });
    await this.cache.delByPrefix(`bootstrap:${tenantId}`);
    await this.cache.delByPrefix(`menu:${tenantId}`);
    return { ...brand, banners: this.parseBanners(brand.banners) };
  }
}
