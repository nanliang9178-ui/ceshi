/* eslint-disable no-console */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

// 读取 apps/api/.env（seed 由 ts-node 直接执行，不会自动加载）
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
  cover: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80',
  logo: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=200&q=80',
  banner1: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80',
  banner2: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80',
  fish: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600&q=80',
  beef: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80',
  chicken: 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=600&q=80',
  tofu: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
  greens: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&q=80',
  dumpling: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&q=80',
  noodle: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&q=80',
  rice: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?w=600&q=80',
  tea: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&q=80',
  drink: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&q=80',
  snack: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?w=600&q=80',
};

interface SeedProduct {
  name: string;
  description: string;
  image: string;
  price: number;
  originalPrice?: number;
  monthlySales: number;
  soldOut?: boolean;
  specGroups?: Array<{
    name: string;
    required?: boolean;
    multiple?: boolean;
    options: Array<{ name: string; priceDelta?: number; defaultSelected?: boolean }>;
  }>;
}

const MENU: Array<{ name: string; products: SeedProduct[] }> = [
  {
    name: '招牌必点',
    products: [
      {
        name: '巷子口酸菜鱼',
        description: '现杀黑鱼片，酸爽开胃，2-3 人份',
        image: IMG.fish,
        price: 6800,
        originalPrice: 7800,
        monthlySales: 326,
        specGroups: [
          { name: '份量', options: [{ name: '小份', defaultSelected: true }, { name: '大份', priceDelta: 2000 }] },
          {
            name: '辣度',
            options: [{ name: '微辣' }, { name: '中辣', defaultSelected: true }, { name: '特辣', priceDelta: 0 }],
          },
          {
            name: '加料',
            multiple: false,
            required: false,
            options: [{ name: '不加', defaultSelected: true }, { name: '加豆皮', priceDelta: 500 }, { name: '加宽粉', priceDelta: 600 }],
          },
        ],
      },
      {
        name: '干锅牛蛙',
        description: '鲜活牛蛙现炒，麻辣鲜香',
        image: IMG.beef,
        price: 8800,
        monthlySales: 218,
        specGroups: [
          { name: '辣度', options: [{ name: '微辣' }, { name: '中辣', defaultSelected: true }, { name: '变态辣' }] },
        ],
      },
      {
        name: '脆皮烧鸡（半只）',
        description: '果木炭火现烤，皮脆肉嫩',
        image: IMG.chicken,
        price: 5800,
        monthlySales: 402,
        specGroups: [
          {
            name: '口味',
            options: [{ name: '原味', defaultSelected: true }, { name: '蒜香', priceDelta: 300 }, { name: '藤椒', priceDelta: 300 }],
          },
        ],
      },
    ],
  },
  {
    name: '经典热菜',
    products: [
      { name: '麻婆豆腐', description: '郫县豆瓣 + 汉源花椒，下饭神器', image: IMG.tofu, price: 2600, monthlySales: 512 },
      { name: '手撕包菜', description: '大火爆炒，锅气十足', image: IMG.greens, price: 1800, monthlySales: 388 },
      { name: '水煮牛肉', description: '嫩牛肉片配秘制红汤', image: IMG.beef, price: 6200, monthlySales: 176 },
      { name: '蒜蓉时蔬', description: '每日新鲜直采，清爽解腻', image: IMG.greens, price: 1600, monthlySales: 264, soldOut: true },
    ],
  },
  {
    name: '凉菜小食',
    products: [
      { name: '口水鸡', description: '冰镇三黄鸡，红油秘制', image: IMG.chicken, price: 3200, monthlySales: 198 },
      { name: '凉拌木耳', description: '爽脆开胃，酸辣适口', image: IMG.snack, price: 1500, monthlySales: 233 },
      { name: '手工锅贴（6 只）', description: '现包现煎，底部金黄酥脆', image: IMG.dumpling, price: 2200, monthlySales: 445 },
    ],
  },
  {
    name: '主食',
    products: [
      {
        name: '招牌酸汤肥牛面',
        description: '现熬骨汤，手工面',
        image: IMG.noodle,
        price: 2800,
        monthlySales: 367,
        specGroups: [
          { name: '面量', options: [{ name: '正常', defaultSelected: true }, { name: '加面', priceDelta: 400 }] },
          { name: '辣度', options: [{ name: '不辣' }, { name: '微辣', defaultSelected: true }, { name: '中辣' }] },
        ],
      },
      { name: '猪油拌饭', description: '现炼猪油 + 酱油膏，简单却上瘾', image: IMG.rice, price: 1200, monthlySales: 289 },
    ],
  },
  {
    name: '饮品',
    products: [
      { name: '冰镇酸梅汤（壶）', description: '古法熬制，解辣必备', image: IMG.tea, price: 1800, monthlySales: 320 },
      { name: '鲜榨西瓜汁', description: '当日现榨，不加水不加糖', image: IMG.drink, price: 1600, monthlySales: 210 },
      { name: '手打柠檬茶', description: '香水柠檬 + 鸭屎香茶底', image: IMG.drink, price: 1400, monthlySales: 275 },
    ],
  },
];

/** 分类图标与左侧营销位文案（顾客端点单页顶部横条 / 左侧竖栏） */
const CATEGORY_META: Record<string, { icon: string; promoLabel?: string; promoTitle?: string }> = {
  招牌必点: { icon: '🔥', promoLabel: '店长推荐', promoTitle: '招牌必点' },
  经典热菜: { icon: '🍲', promoLabel: '下饭神器', promoTitle: '经典热菜' },
  凉菜小食: { icon: '🥗', promoLabel: '开胃小菜', promoTitle: '凉菜小食' },
  主食: { icon: '🍜' },
  饮品: { icon: '🧋', promoLabel: '解辣必备', promoTitle: '手作饮品' },
};

/** 商品标签，逗号分隔；渲染为卡片左上角红色角标 */
const PRODUCT_TAGS: Record<string, string> = {
  巷子口酸菜鱼: '招牌,热销',
  干锅牛蛙: '招牌',
  '脆皮烧鸡（半只）': '热销',
  麻婆豆腐: '招牌',
  水煮牛肉: '热销',
  '手工锅贴（6 只）': '热销',
  招牌酸汤肥牛面: '招牌',
  手打柠檬茶: '新品',
  鲜榨西瓜汁: '新品',
};

const TABLES: Array<{ area: string; prefix: string; count: number; seats: number }> = [
  { area: '大厅', prefix: 'A', count: 8, seats: 4 },
  { area: '靠窗', prefix: 'C', count: 4, seats: 2 },
  { area: '包间', prefix: 'B', count: 3, seats: 8 },
];

function sceneCode(): string {
  return Math.random().toString(36).slice(2, 12);
}

function orderNo(offset: number): string {
  const d = new Date();
  const day = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `${day}${String(90000000 + offset)}`;
}

async function main(): Promise<void> {
  console.log('开始初始化数据…');

  const adminUsername = process.env.PLATFORM_ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.PLATFORM_ADMIN_PASSWORD || 'admin888';
  await prisma.platformUser.upsert({
    where: { username: adminUsername },
    update: {},
    create: {
      username: adminUsername,
      name: '平台运营',
      role: 'SUPER_ADMIN',
      passwordHash: await bcrypt.hash(adminPassword, 10),
    },
  });
  console.log(`平台账号: ${adminUsername} / ${adminPassword}`);

  if (process.env.SEED_DEMO === 'false') {
    console.log('已跳过演示商户数据');
    return;
  }

  const existed = await prisma.tenant.findUnique({ where: { code: 'demo' } });
  if (existed && process.env.SEED_RESET !== 'false') {
    await prisma.tenant.delete({ where: { code: 'demo' } });
    console.log('已清理旧的演示商户数据');
  }

  const tenant = await prisma.tenant.create({
    data: {
      code: 'demo',
      name: '椒香里·川味小馆',
      contactName: '王老板',
      contactPhone: '13800138000',
      plan: 'PRO',
      status: 'ACTIVE',
      expireAt: new Date(Date.now() + 365 * 24 * 3600 * 1000),
      brand: {
        create: {
          logoUrl: IMG.logo,
          coverUrl: IMG.cover,
          primaryColor: '#FF5A1F',
          accentColor: '#F2B544',
          slogan: '一勺红油，半城烟火',
          announcement: '本店所有菜品现点现做，出餐约 15 分钟，感谢等待～',
          servicePhone: '13800138000',
          copyright: '© 2026 椒香里餐饮 · 由天枢点单提供技术支持',
          banners: JSON.stringify([
            { url: IMG.banner1, link: '' },
            { url: IMG.banner2, link: '' },
          ]),
        },
      },
      store: {
        create: {
          name: '椒香里·川味小馆（万象城店）',
          address: '成都市锦江区红星路三段 1 号 3F-08',
          phone: '13800138000',
          businessHours: '10:00-22:00',
          openStatus: true,
          autoAccept: false,
          packingFee: 200,
          minOrderAmount: 1500,
          deliveryFee: 300,
          deliveryMinAmount: 2000,
          deliveryRange: '3 公里内配送，满 20 元起送',
          deliveryEta: 35,
          fullReduceThreshold: 8800,
          fullReduceAmount: 1000,
          notice: '堂食扫码点单，出餐口取餐；外卖 3 公里内配送。',
        },
      },
      paymentConfig: { create: {} },
    },
    include: { store: true },
  });
  console.log(`演示商户: ${tenant.name}（编码 ${tenant.code}）`);

  const ownerPassword = 'demo888';
  await prisma.staffUser.create({
    data: {
      tenantId: tenant.id,
      storeId: tenant.store!.id,
      username: 'demo',
      name: '王老板',
      role: 'OWNER',
      passwordHash: await bcrypt.hash(ownerPassword, 10),
    },
  });
  await prisma.staffUser.create({
    data: {
      tenantId: tenant.id,
      storeId: tenant.store!.id,
      username: 'staff',
      name: '小李',
      role: 'STAFF',
      passwordHash: await bcrypt.hash('staff888', 10),
    },
  });
  console.log(`商户账号: demo / ${ownerPassword}（店员 staff / staff888）`);

  // 桌位
  const tables: Array<{ id: string; name: string; area: string }> = [];
  for (const group of TABLES) {
    for (let i = 1; i <= group.count; i += 1) {
      const name = `${group.prefix}${String(i).padStart(2, '0')}`;
      const table = await prisma.diningTable.create({
        data: {
          tenantId: tenant.id,
          storeId: tenant.store!.id,
          sceneCode: sceneCode(),
          name,
          area: group.area,
          seats: group.seats,
        },
      });
      tables.push({ id: table.id, name: table.name, area: table.area });
    }
  }
  console.log(`已创建 ${tables.length} 个桌位`);

  // 菜单
  const products: Array<{ id: string; name: string; price: number; image: string }> = [];
  for (const [categoryIndex, category] of MENU.entries()) {
    const meta = CATEGORY_META[category.name] || { icon: '' };
    const createdCategory = await prisma.category.create({
      data: {
        tenantId: tenant.id,
        storeId: tenant.store!.id,
        name: category.name,
        icon: meta.icon || null,
        promoLabel: meta.promoLabel || null,
        promoTitle: meta.promoTitle || null,
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
          originalPrice: product.originalPrice,
          monthlySales: product.monthlySales,
          tags: PRODUCT_TAGS[product.name] || '',
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
  console.log(`已创建 ${products.length} 道菜品`);

  // 演示订单：覆盖待接单/制作中/待取餐/已完成/已退款
  const customers = await Promise.all(
    [
      { openid: 'demo-openid-001', nickname: '小满', phone: '13800138001' },
      { openid: 'demo-openid-002', nickname: '阿哲', phone: '13800138002' },
      { openid: 'demo-openid-003', nickname: '橙子', phone: '13800138003' },
      { openid: 'demo-openid-004', nickname: '果冻', phone: '13800138004' },
    ].map((item) =>
      prisma.customer.create({ data: { tenantId: tenant.id, ...item, lastLoginAt: new Date() } }),
    ),
  );

  const statuses = [
    { status: 'PENDING', payStatus: 'PAID', minutesAgo: 3, type: 'DELIVERY' },
    { status: 'PENDING', payStatus: 'PAID', minutesAgo: 6 },
    { status: 'PREPARING', payStatus: 'PAID', minutesAgo: 12 },
    { status: 'PREPARING', payStatus: 'PAID', minutesAgo: 18 },
    { status: 'READY', payStatus: 'PAID', minutesAgo: 26 },
    { status: 'COMPLETED', payStatus: 'PAID', minutesAgo: 48 },
    { status: 'COMPLETED', payStatus: 'PAID', minutesAgo: 76 },
    { status: 'COMPLETED', payStatus: 'PAID', minutesAgo: 132 },
    { status: 'COMPLETED', payStatus: 'PAID', minutesAgo: 1560 },
    { status: 'COMPLETED', payStatus: 'PAID', minutesAgo: 2880 },
    { status: 'CANCELLED', payStatus: 'REFUNDED', minutesAgo: 96 },
  ];

  for (const [index, item] of statuses.entries()) {
    const table = tables[index % tables.length];
    const customer = customers[index % customers.length];
    const product1 = products[index % products.length];
    const product2 = products[(index + 3) % products.length];
    const qty1 = 1 + (index % 2);
    const qty2 = 1;
    const itemAmount = product1.price * qty1 + product2.price * qty2;
    const discount = itemAmount >= 8800 ? 1000 : 0;
    const isDelivery = (item as { type?: string }).type === 'DELIVERY';
    const deliveryFee = isDelivery ? 300 : 0;
    const total = itemAmount - discount + deliveryFee;
    const createdAt = new Date(Date.now() - item.minutesAgo * 60_000);

    await prisma.order.create({
      data: {
        orderNo: orderNo(index),
        tenantId: tenant.id,
        storeId: tenant.store!.id,
        tableId: isDelivery ? null : table.id,
        tableName: isDelivery ? null : table.name,
        type: isDelivery ? 'DELIVERY' : 'DINE_IN',
        status: item.status,
        payStatus: item.payStatus,
        customerId: customer.id,
        customerName: customer.nickname,
        peopleCount: isDelivery ? null : 2 + (index % 3),
        receiverName: isDelivery ? '周女士' : null,
        receiverPhone: isDelivery ? '13800138066' : null,
        address: isDelivery ? '锦江区红星路三段 1 号 IFS 写字楼 A 座 1802 室' : null,
        deliveryFee,
        deliveryEta: isDelivery ? 35 : null,
        itemAmount,
        discountAmount: discount,
        packingFee: 0,
        totalAmount: total,
        paidAmount: item.payStatus === 'PAID' ? total : 0,
        pickupNo: index + 1,
        payChannel: 'MOCK',
        transactionId: `mock-${Date.now()}-${index}`,
        paidAt: createdAt,
        acceptAt: ['PREPARING', 'READY', 'COMPLETED'].includes(item.status) ? createdAt : null,
        readyAt: ['READY', 'COMPLETED'].includes(item.status) ? createdAt : null,
        completeAt: item.status === 'COMPLETED' ? createdAt : null,
        createdAt,
        items: {
          create: [
            {
              tenantId: tenant.id,
              productId: product1.id,
              productName: product1.name,
              imageUrl: product1.image,
              unitPrice: product1.price,
              quantity: qty1,
              amount: product1.price * qty1,
              specText: '份量:标准 / 辣度:中辣',
            },
            {
              tenantId: tenant.id,
              productId: product2.id,
              productName: product2.name,
              imageUrl: product2.image,
              unitPrice: product2.price,
              quantity: qty2,
              amount: product2.price * qty2,
            },
          ],
        },
      },
    });
  }
  console.log(`已创建 ${statuses.length} 笔演示订单`);

  console.log('\n初始化完成，可直接体验：');
  console.log('  商户后台  demo / demo888  （商户编码 demo）');
  console.log(`  平台后台  ${adminUsername} / ${adminPassword}`);
  console.log(`  桌码 scene: ${tables[0].name} -> ${(await prisma.diningTable.findFirst({ where: { tenantId: tenant.id, name: tables[0].name } }))!.sceneCode}`);
}

main()
  .catch((error) => {
    console.error('初始化失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
