import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { CacheModule } from './common/cache/cache.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClientModule } from './modules/client/client.module';
import { H5Module } from './modules/h5/h5.module';
import { MenuModule } from './modules/menu/menu.module';
import { OrderModule } from './modules/order/order.module';
import { PayModule } from './modules/pay/pay.module';
import { PlatformModule } from './modules/platform/platform.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { StaffModule } from './modules/staff/staff.module';
import { StatsModule } from './modules/stats/stats.module';
import { StoreModule } from './modules/store/store.module';
import { TableModule } from './modules/table/table.module';
import { UploadModule } from './modules/upload/upload.module';
import { WechatModule } from './modules/wechat/wechat.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.registerAsync({
      global: true,
      useFactory: () => ({
        secret: process.env.JWT_SECRET || 'tianshu-dev-secret',
        signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN || '12h') as any },
      }),
    }),
    PrismaModule,
    CacheModule,
    AuthModule,
    ClientModule,
    H5Module,
    StoreModule,
    MenuModule,
    TableModule,
    StaffModule,
    OrderModule,
    PayModule,
    StatsModule,
    UploadModule,
    WechatModule,
    RealtimeModule,
    PlatformModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
  ],
})
export class AppModule {}
