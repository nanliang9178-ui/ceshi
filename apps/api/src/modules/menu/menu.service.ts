import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { AvailabilityDto, CategoryDto, ProductDto, SortDto } from './dto';

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  private async storeIdOf(tenantId: string): Promise<string> {
    const store = await this.prisma.store.findUnique({ where: { tenantId }, select: { id: true } });
    if (!store) throw new NotFoundException('门店不存在');
    return store.id;
  }

  private async invalidate(tenantId: string): Promise<void> {
    await this.cache.delByPrefix(`menu:${tenantId}`);
    await this.cache.delByPrefix(`bootstrap:${tenantId}`);
  }

  // ---------------- 顾客端菜单 ----------------

  /** 顾客端菜单聚合（60 秒缓存，菜单变更主动失效） */
  async getClientMenu(tenantId: string) {
    const cacheKey = `menu:${tenantId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const categories = await this.prisma.category.findMany({
      where: { tenantId, status: 'ON' },
      orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
      include: {
        products: {
          where: { status: 'ON' },
          orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
          include: {
            specGroups: {
              orderBy: { sort: 'asc' },
              include: { options: { orderBy: { sort: 'asc' } } },
            },
          },
        },
      },
    });

    const result = categories
      .map((category) => ({
        id: category.id,
        name: category.name,
        icon: category.icon || '',
        promoLabel: category.promoLabel || '',
        promoTitle: category.promoTitle || '',
        products: category.products.map((product) => ({
          id: product.id,
          name: product.name,
          description: product.description,
          imageUrl: product.imageUrl,
          price: product.price,
          originalPrice: product.originalPrice,
          unit: product.unit,
          tags: (product.tags || '').split(',').filter(Boolean),
          monthlySales: product.monthlySales,
          soldOut: product.soldOut || (product.stockEnabled && product.stock <= 0),
          stock: product.stockEnabled ? product.stock : null,
          specGroups: product.specGroups.map((group) => ({
            id: group.id,
            name: group.name,
            required: group.required,
            multiple: group.multiple,
            options: group.options.map((option) => ({
              id: option.id,
              name: option.name,
              priceDelta: option.priceDelta,
              defaultSelected: option.defaultSelected,
            })),
          })),
        })),
      }))
      .filter((category) => category.products.length > 0);

    await this.cache.set(cacheKey, result, 60);
    return result;
  }

  // ---------------- 分类 ----------------

  listCategories(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId },
      orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
  }

  async createCategory(tenantId: string, dto: CategoryDto) {
    const storeId = await this.storeIdOf(tenantId);
    const count = await this.prisma.category.count({ where: { tenantId } });
    const category = await this.prisma.category.create({
      data: {
        tenantId,
        storeId,
        name: dto.name.trim(),
        icon: dto.icon || null,
        promoLabel: dto.promoLabel || null,
        promoTitle: dto.promoTitle || null,
        sort: dto.sort ?? count,
        status: dto.status || 'ON',
      },
    });
    await this.invalidate(tenantId);
    return category;
  }

  async updateCategory(tenantId: string, id: string, dto: CategoryDto) {
    await this.ensureCategory(tenantId, id);
    const category = await this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        icon: dto.icon ?? undefined,
        promoLabel: dto.promoLabel ?? undefined,
        promoTitle: dto.promoTitle ?? undefined,
        sort: dto.sort,
        status: dto.status,
      },
    });
    await this.invalidate(tenantId);
    return category;
  }

  async removeCategory(tenantId: string, id: string) {
    await this.ensureCategory(tenantId, id);
    const productCount = await this.prisma.product.count({ where: { categoryId: id, tenantId } });
    if (productCount > 0) throw new BadRequestException('该分类下还有菜品，请先移动或删除菜品');
    await this.prisma.category.delete({ where: { id } });
    await this.invalidate(tenantId);
    return { success: true };
  }

  private async ensureCategory(tenantId: string, id: string) {
    const category = await this.prisma.category.findFirst({ where: { id, tenantId } });
    if (!category) throw new NotFoundException('分类不存在');
    return category;
  }

  // ---------------- 商品 ----------------

  listProducts(tenantId: string, query: { categoryId?: string; keyword?: string; status?: string }) {
    const where: any = { tenantId };
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.status) where.status = query.status;
    if (query.keyword) where.name = { contains: query.keyword.trim() };
    return this.prisma.product.findMany({
      where,
      orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
      include: {
        category: { select: { id: true, name: true } },
        specGroups: { orderBy: { sort: 'asc' }, include: { options: { orderBy: { sort: 'asc' } } } },
      },
    });
  }

  async getProduct(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
      include: {
        category: { select: { id: true, name: true } },
        specGroups: { orderBy: { sort: 'asc' }, include: { options: { orderBy: { sort: 'asc' } } } },
      },
    });
    if (!product) throw new NotFoundException('菜品不存在');
    return product;
  }

  private validateSpecGroups(dto: ProductDto): void {
    for (const group of dto.specGroups || []) {
      if (!group.options || group.options.length === 0) {
        throw new BadRequestException(`规格「${group.name}」至少需要一个选项`);
      }
      if (!group.multiple && group.options.filter((option) => option.defaultSelected).length > 1) {
        throw new BadRequestException(`规格「${group.name}」为单选，不能设置多个默认项`);
      }
    }
  }

  async createProduct(tenantId: string, dto: ProductDto) {
    const storeId = await this.storeIdOf(tenantId);
    await this.ensureCategory(tenantId, dto.categoryId);
    this.validateSpecGroups(dto);
    const count = await this.prisma.product.count({ where: { tenantId } });

    const product = await this.prisma.product.create({
      data: {
        tenantId,
        storeId,
        categoryId: dto.categoryId,
        name: dto.name.trim(),
        description: dto.description,
        imageUrl: dto.imageUrl,
        price: dto.price,
        originalPrice: dto.originalPrice,
        unit: dto.unit || '份',
        tags: (dto.tags || []).join(','),
        stockEnabled: dto.stockEnabled ?? false,
        stock: dto.stock ?? 0,
        soldOut: dto.soldOut ?? false,
        status: dto.status || 'ON',
        sort: dto.sort ?? count,
        specGroups: {
          create: (dto.specGroups || []).map((group, groupIndex) => ({
            tenantId,
            name: group.name,
            required: group.required ?? true,
            multiple: group.multiple ?? false,
            sort: group.sort ?? groupIndex,
            options: {
              create: (group.options || []).map((option, optionIndex) => ({
                tenantId,
                name: option.name,
                priceDelta: option.priceDelta ?? 0,
                sort: option.sort ?? optionIndex,
                defaultSelected: option.defaultSelected ?? false,
              })),
            },
          })),
        },
      },
      include: { specGroups: { include: { options: true } } },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorType: 'STAFF',
        action: 'PRODUCT_CREATE',
        targetType: 'Product',
        targetId: product.id,
        detail: `新增菜品「${product.name}」，售价 ${(product.price / 100).toFixed(2)} 元`,
      },
    });
    await this.invalidate(tenantId);
    return product;
  }

  async updateProduct(tenantId: string, id: string, dto: ProductDto) {
    const current = await this.getProduct(tenantId, id);
    await this.ensureCategory(tenantId, dto.categoryId);
    this.validateSpecGroups(dto);

    // 规格整体替换：先删后建，保证与前端提交一致
    await this.prisma.$transaction(async (tx) => {
      if (dto.specGroups) {
        await tx.specGroup.deleteMany({ where: { productId: id } });
      }
      await tx.product.update({
        where: { id },
        data: {
          categoryId: dto.categoryId,
          name: dto.name.trim(),
          description: dto.description,
          imageUrl: dto.imageUrl,
          price: dto.price,
          originalPrice: dto.originalPrice,
          unit: dto.unit || '份',
          tags: dto.tags ? dto.tags.join(',') : current.tags,
          stockEnabled: dto.stockEnabled ?? current.stockEnabled,
          stock: dto.stock ?? current.stock,
          soldOut: dto.soldOut ?? current.soldOut,
          status: dto.status || current.status,
          sort: dto.sort ?? current.sort,
        },
      });
      for (const [groupIndex, group] of (dto.specGroups || []).entries()) {
        await tx.specGroup.create({
          data: {
            tenantId,
            productId: id,
            name: group.name,
            required: group.required ?? true,
            multiple: group.multiple ?? false,
            sort: group.sort ?? groupIndex,
            options: {
              create: (group.options || []).map((option, optionIndex) => ({
                tenantId,
                name: option.name,
                priceDelta: option.priceDelta ?? 0,
                sort: option.sort ?? optionIndex,
                defaultSelected: option.defaultSelected ?? false,
              })),
            },
          },
        });
      }
    });

    if (current.price !== dto.price) {
      await this.prisma.auditLog.create({
        data: {
          tenantId,
          actorType: 'STAFF',
          action: 'PRODUCT_PRICE_CHANGE',
          targetType: 'Product',
          targetId: id,
          detail: `「${current.name}」价格由 ${(current.price / 100).toFixed(2)} 元调整为 ${(dto.price / 100).toFixed(2)} 元`,
        },
      });
    }

    await this.invalidate(tenantId);
    return this.getProduct(tenantId, id);
  }

  async setAvailability(tenantId: string, id: string, dto: AvailabilityDto) {
    await this.getProduct(tenantId, id);
    const product = await this.prisma.product.update({
      where: { id },
      data: { soldOut: dto.soldOut, status: dto.status },
    });
    await this.invalidate(tenantId);
    return product;
  }

  async removeProduct(tenantId: string, id: string) {
    await this.getProduct(tenantId, id);
    await this.prisma.product.delete({ where: { id } });
    await this.invalidate(tenantId);
    return { success: true };
  }

  async duplicateProduct(tenantId: string, id: string) {
    const source = await this.getProduct(tenantId, id);
    return this.createProduct(tenantId, {
      categoryId: source.categoryId,
      name: `${source.name}（复制）`.slice(0, 40),
      description: source.description || undefined,
      imageUrl: source.imageUrl || undefined,
      price: source.price,
      originalPrice: source.originalPrice || undefined,
      unit: source.unit,
      stockEnabled: source.stockEnabled,
      stock: source.stock,
      soldOut: source.soldOut,
      status: 'OFF',
      tags: (source.tags || '').split(',').filter(Boolean),
      sort: source.sort + 1,
      specGroups: source.specGroups.map((group) => ({
        name: group.name,
        required: group.required,
        multiple: group.multiple,
        sort: group.sort,
        options: group.options.map((option) => ({
          name: option.name,
          priceDelta: option.priceDelta,
          sort: option.sort,
          defaultSelected: option.defaultSelected,
        })),
      })),
    });
  }

  async sortCategories(tenantId: string, dto: SortDto) {
    await this.prisma.$transaction(
      dto.ids.map((id, index) => this.prisma.category.update({ where: { id }, data: { sort: index } })),
    );
    await this.invalidate(tenantId);
    return { success: true };
  }
}
