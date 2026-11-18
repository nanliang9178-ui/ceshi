/* eslint-disable no-console */
/**
 * 隆江猪脚饭演示商户
 * 执行：npm run seed:longjiang
 * 生成后可直接用商户编码 zhujiao 体验商户端，扫码体验客户端点单。
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const envPath = join(process.cwd(), '.env');
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .forEach((line) => {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
      }
    });
}

const prisma = new PrismaClient();

const IMG = {
  cover: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80',
  logo: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=240&q=80',
  banner1: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80',
  banner2: 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=1200&q=80',
  trotter: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80',
  porkRice: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&q=80',
  roasted: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=600&q=80',
  intestine: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&q=80',
  egg: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&q=80',
  tofu: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
  chickenFeet: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=600&q=80',
  greens: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&q=80',
  soup: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80',
  drink: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&q=80',
  combo: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=600&q=80',
};

interface SeedProduct {
  name: string;
  description: string;
  image: string;
  price: number;
  originalPrice?: number;
  monthlySales: number;
  tags?: string;
  soldOut?: boolean;
  specGroups?: Array<{
    name: string;
    required?: boolean;
    multiple?: boolean;
    options: Array<{ name: string; priceDelta?: number; defaultSelected?: boolean }>;
  }>;
}

const MENU: Array<{
  name: string;
  icon: string;
  promoLabel?: string;
  promoTitle?: string;
  products: SeedProduct[];
}> = [
  {
    name: '招牌猪脚饭',
    icon: '🍖',
    promoLabel: '现卤现切',
    promoTitle: '招牌猪脚',
    products: [
      {
        name: '隆江猪脚饭（半肥瘦）',
        description: '潮汕卤水慢炖 8 小时，胶质软糯，配酸菜与卤汁饭',
        image: IMG.trotter,
        price: 2800,
        originalPrice: 3200,
        monthlySales: 862,
        tags: '招牌,热销',
        specGroups: [
          {
            name: '份量',
            options: [
              { name: '标准', defaultSelected: true },
              { name: '加饭', priceDelta: 200 },
              { name: '大份双倍肉', priceDelta: 800 },
            ],
          },
          {
            name: '辣度',
            options: [{ name: '不辣', defaultSelected: true }, { name: '微辣' }, { name: '中辣' }],
          },
          {
            name: '加料',
            required: false,
            multiple: true,
            options: [
              { name: '卤蛋', priceDelta: 300 },
              { name: '卤豆腐', priceDelta: 200 },
              { name: '酸菜', priceDelta: 100 },
              { name: '青菜', priceDelta: 300 },
            ],
          },
        ],
      },
      {
        name: '猪脚饭（全瘦）',
        description: '选猪前腿瘦肉，卤香入味不油腻',
        image: IMG.porkRice,
        price: 3000,
        monthlySales: 431,
        tags: '热销',
        specGroups: [
          {
            name: '份量',
            options: [{ name: '标准', defaultSelected: true }, { name: '加饭', priceDelta: 200 }],
          },
          {
            name: '辣度',
            options: [{ name: '不辣', defaultSelected: true }, { name: '微辣' }, { name: '中辣' }],
          },
        ],
      },
      {
        name: '四点金猪脚饭',
        description: '猪脚最精华部位，一只脚只出两份，胶质弹牙',
        image: IMG.trotter,
        price: 3200,
        monthlySales: 268,
        tags: '招牌',
        specGroups: [
          {
            name: '份量',
            options: [{ name: '标准', defaultSelected: true }, { name: '加饭', priceDelta: 200 }],
          },
        ],
      },
      {
        name: '双拼饭（猪脚+烧鸭）',
        description: '半边卤猪脚配脆皮烧鸭，一次吃到两种招牌',
        image: IMG.roasted,
        price: 3800,
        originalPrice: 4200,
        monthlySales: 356,
        tags: '新品',
      },
      {
        name: '猪脚拼卤大肠饭',
        description: '处理干净的大肠卤到透亮，配猪脚更下饭',
        image: IMG.intestine,
        price: 3600,
        monthlySales: 187,
        soldOut: false,
      },
    ],
  },
  {
    name: '卤味小菜',
    icon: '🥢',
    promoLabel: '现卤现捞',
    promoTitle: '卤味小菜',
    products: [
      { name: '卤蛋', description: '卤汁浸泡 6 小时，蛋黄入味', image: IMG.egg, price: 300, monthlySales: 921, tags: '热销' },
      { name: '卤水豆腐', description: '老豆腐先炸后卤，外韧内嫩', image: IMG.tofu, price: 400, monthlySales: 512 },
      { name: '卤鸡爪（3 只）', description: '脱骨软糯，追剧必备', image: IMG.chickenFeet, price: 1200, monthlySales: 386 },
      { name: '卤猪耳', description: '脆爽弹牙，切片装盘', image: IMG.intestine, price: 1800, monthlySales: 142 },
      { name: '白灼菜心', description: '当日新鲜菜心，淋豉油', image: IMG.greens, price: 800, monthlySales: 274 },
    ],
  },
  {
    name: '汤品',
    icon: '🍲',
    products: [
      { name: '每日例汤', description: '每天一款，猪骨打底，免费续汤', image: IMG.soup, price: 500, monthlySales: 640, tags: '热销' },
      { name: '紫菜蛋花汤', description: '清爽解腻，配猪脚饭刚好', image: IMG.soup, price: 800, monthlySales: 233 },
      { name: '苦瓜排骨汤', description: '潮汕老火汤，回甘下火', image: IMG.soup, price: 1200, monthlySales: 118 },
    ],
  },
  {
    name: '超值套餐',
    icon: '🍱',
    promoLabel: '立省 5 元',
    promoTitle: '超值套餐',
    products: [
      {
        name: '猪脚饭 + 例汤 + 青菜',
        description: '招牌猪脚饭配每日例汤与白灼菜心，一人食刚刚好',
        image: IMG.combo,
        price: 3300,
        originalPrice: 3900,
        monthlySales: 495,
        tags: '招牌',
      },
      {
        name: '双拼饭 + 例汤',
        description: '猪脚烧鸭双拼，配汤更满足',
        image: IMG.roasted,
        price: 4200,
        originalPrice: 4600,
        monthlySales: 208,
      },
    ],
  },
  {
    name: '饮品',
    icon: '🥤',
    products: [
      { name: '冰镇酸梅汤', description: '解腻神器，冰镇更爽口', image: IMG.drink, price: 600, monthlySales: 388 },
      { name: '冻柠檬茶', description: '手打柠檬，微酸回甘', image: IMG.drink, price: 700, monthlySales: 264, tags: '新品' },
      { name: '可乐 / 雪碧', description: '冰镇罐装', image: IMG.drink, price: 500, monthlySales: 412 },
    ],
  },
];

const TABLES = [
  { area: '大厅', prefix: 'A', count: 8, seats: 4 },
  { area: '靠窗', prefix: 'C', count: 4, seats: 2 },
];

function sceneCode(): string {
  return Math.random().toString(36).slice(2, 12);
}

function orderNo(offset: number): string {
  const d = new Date();
  const day = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `${day}${String(70000000 + offset)}`;
}

async function main(): Promise<void> {
  const existed = await prisma.tenant.findUnique({ where: { code: 'zhujiao' } });
  if (existed) {
    await prisma.tenant.delete({ where: { code: 'zhujiao' } });
    console.log('已清理旧的隆江猪脚饭数据');
  }

  const tenant = await prisma.tenant.create({
    data: {
      code: 'zhujiao',
      name: '阿强隆江猪脚饭',
      status: 'ACTIVE',
      plan: 'PRO',
      expireAt: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      brand: {
        create: {
          logoUrl: IMG.logo,
          coverUrl: IMG.cover,
          primaryColor: '#B4321F',
          accentColor: '#F2B544',
          slogan: '一碗猪脚饭，卤足八小时',
          announcement: '每日 10:30 开锅，猪脚现卤现切；外卖 3 公里内配送，满 25 元起送。',
          servicePhone: '0755-88886666',
          copyright: '阿强隆江猪脚饭 · 本店由天枢点单提供技术支持',
          banners: JSON.stringify([{ url: IMG.banner1 }, { url: IMG.banner2 }]),
        },
      },
      store: {
        create: {
          name: '阿强隆江猪脚饭（华强北店）',
          address: '深圳市福田区华强北路 1002 号 1F-05',
          phone: '0755-88886666',
          businessHours: '10:30-21:30',
          openStatus: true,
          autoAccept: false,
          packingFee: 100,
          minOrderAmount: 1500,
          deliveryFee: 300,
          deliveryMinAmount: 2500,
          deliveryRange: '3 公里内配送，满 25 元起送',
          deliveryEta: 30,
          fullReduceThreshold: 3000,
          fullReduceAmount: 300,
          notice: '堂食扫码点单，出餐口取餐；外卖由店员配送，请保持电话畅通。',
        },
      },
      paymentConfig: { create: {} },
    },
    include: { store: true },
  });
  console.log(`商户已创建：${tenant.name}（编码 ${tenant.code}）`);

  const ownerPassword = 'zhujiao888';
  await prisma.staffUser.create({
    data: {
      tenantId: tenant.id,
      storeId: tenant.store!.id,
      username: 'zhujiao',
      name: '强哥',
      role: 'OWNER',
      passwordHash: await bcrypt.hash(ownerPassword, 10),
    },
  });
  await prisma.staffUser.create({
    data: {
      tenantId: tenant.id,
      storeId: tenant.store!.id,
      username: 'zjstaff',
      name: '阿珍',
      role: 'STAFF',
      passwordHash: await bcrypt.hash('zjstaff888', 10),
    },
  });

  // 桌位
  const tables: Array<{ id: string; name: string }> = [];
  for (const group of TABLES) {
    for (let i = 1; i <= group.count; i += 1) {
      const table = await prisma.diningTable.create({
        data: {
          tenantId: tenant.id,
          storeId: tenant.store!.id,
          sceneCode: sceneCode(),
          name: `${group.prefix}${String(i).padStart(2, '0')}`,
          area: group.area,
          seats: group.seats,
        },
      });
      tables.push({ id: table.id, name: table.name });
    }
  }

  // 菜单
  const products: Array<{ id: string; name: string; price: number; image: string }> = [];
  for (const [categoryIndex, category] of MENU.entries()) {
    const createdCategory = await prisma.category.create({
      data: {
        tenantId: tenant.id,
        storeId: tenant.store!.id,
        name: category.name,
        icon: category.icon,
        promoLabel: category.promoLabel || null,
        promoTitle: category.promoTitle || null,
        sort: categoryIndex,
      },
    });
    for (const [productIndex, product] of category.products.entries()) {
      const created = await prisma.product.create({
        data: {
          tenantId: tenant.id,
          storeId: tenant.store!.id,
          categoryId: createdCategory.id,
          name: product.name,
          description: product.description,
          imageUrl: product.image,
          price: product.price,
          originalPrice: product.originalPrice ?? null,
          monthlySales: product.monthlySales,
          tags: product.tags || '',
          soldOut: product.soldOut ?? false,
          sort: productIndex,
          specGroups: {
            create: (product.specGroups || []).map((group, groupIndex) => ({
              tenantId: tenant.id,
              name: group.name,
              required: group.required ?? true,
              multiple: group.multiple ?? false,
              sort: groupIndex,
              options: {
                create: group.options.map((option, optionIndex) => ({
                  tenantId: tenant.id,
                  name: option.name,
                  priceDelta: option.priceDelta ?? 0,
                  sort: optionIndex,
                  defaultSelected: option.defaultSelected ?? false,
                })),
              },
            })),
          },
        },
      });
      products.push({ id: created.id, name: created.name, price: created.price, image: product.image });
    }
  }
  console.log(`已创建 ${products.length} 道菜品、${tables.length} 个桌位`);

  // 演示订单：待接单 / 制作中 / 已完成
  const customer = await prisma.customer.create({
    data: { tenantId: tenant.id, openid: 'zj-demo-0001', nickname: '小陈', phone: '13900139001', lastLoginAt: new Date() },
  });

  const demoOrders = [
    { status: 'PENDING', payStatus: 'PAID', minutesAgo: 2, type: 'DELIVERY' },
    { status: 'PENDING', payStatus: 'PAID', minutesAgo: 5, type: 'DINE_IN' },
    { status: 'PREPARING', payStatus: 'PAID', minutesAgo: 11, type: 'DINE_IN' },
    { status: 'COMPLETED', payStatus: 'PAID', minutesAgo: 65, type: 'TAKEAWAY' },
  ];

  for (const [index, item] of demoOrders.entries()) {
    const table = tables[index % tables.length];
    const product = products[index % products.length];
    const quantity = 1 + (index % 2);
    const itemAmount = product.price * quantity;
    const deliveryFee = item.type === 'DELIVERY' ? 300 : 0;
    const discount = itemAmount >= 3000 ? 300 : 0;
    const total = itemAmount - discount + deliveryFee;
    const createdAt = new Date(Date.now() - item.minutesAgo * 60_000);

    await prisma.order.create({
      data: {
        orderNo: orderNo(index),
        tenantId: tenant.id,
        storeId: tenant.store!.id,
        tableId: item.type === 'DINE_IN' ? table.id : null,
        tableName: item.type === 'DINE_IN' ? table.name : null,
        type: item.type,
        status: item.status,
        payStatus: item.payStatus,
        customerId: customer.id,
        customerName: customer.nickname,
        peopleCount: item.type === 'DINE_IN' ? 2 : null,
        receiverName: item.type === 'DELIVERY' ? '林小姐' : null,
        receiverPhone: item.type === 'DELIVERY' ? '13900139002' : null,
        address: item.type === 'DELIVERY' ? '福田区华强北路 1002 号 赛格广场 23 楼 2308' : null,
        deliveryFee,
        deliveryEta: item.type === 'DELIVERY' ? 30 : null,
        itemAmount,
        discountAmount: discount,
        packingFee: 0,
        totalAmount: total,
        paidAmount: total,
        pickupNo: index + 1,
        payChannel: 'MOCK',
        transactionId: `mock-zj-${Date.now()}-${index}`,
        paidAt: createdAt,
        acceptAt: item.status !== 'PENDING' ? createdAt : null,
        createdAt,
        items: {
          create: [
            {
              tenantId: tenant.id,
              productId: product.id,
              productName: product.name,
              imageUrl: product.image,
              unitPrice: product.price,
              quantity,
              amount: product.price * quantity,
            },
          ],
        },
      },
    });
  }

  console.log(`已创建 ${demoOrders.length} 笔演示订单`);
  console.log('\n初始化完成：');
  console.log('  商户后台  zhujiao / zhujiao888  （商户编码 zhujiao）');
  console.log('  店员账号  zjstaff / zjstaff888');
  console.log(`  桌位 A01 scene: ${(await prisma.diningTable.findFirst({ where: { tenantId: tenant.id, name: 'A01' } }))?.sceneCode}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
