import { Body, Controller, Get, Put } from '@nestjs/common';
import { Roles, TenantId } from '../../common/decorators';
import { StoreService } from './store.service';
import { UpdateBrandDto, UpdateStoreDto } from './dto';

@Controller('admin/store')
export class StoreController {
  constructor(private readonly store: StoreService) {}

  @Get()
  async overview(@TenantId() tenantId: string) {
    const [store, brand] = await Promise.all([this.store.getStore(tenantId), this.store.getBrand(tenantId)]);
    return { store, brand };
  }

  @Put()
  @Roles('MANAGER')
  update(@TenantId() tenantId: string, @Body() dto: UpdateStoreDto) {
    return this.store.updateStore(tenantId, dto);
  }

  @Put('brand')
  @Roles('OWNER')
  updateBrand(@TenantId() tenantId: string, @Body() dto: UpdateBrandDto) {
    return this.store.updateBrand(tenantId, dto);
  }
}
