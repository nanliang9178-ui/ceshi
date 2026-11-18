import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { Roles, TenantId } from '../../common/decorators';
import { MenuService } from './menu.service';
import { AvailabilityDto, CategoryDto, ProductDto, SortDto } from './dto';

@Controller('admin/menu')
export class MenuController {
  constructor(private readonly menu: MenuService) {}

  @Get('categories')
  listCategories(@TenantId() tenantId: string) {
    return this.menu.listCategories(tenantId);
  }

  @Post('categories')
  @Roles('MANAGER')
  createCategory(@TenantId() tenantId: string, @Body() dto: CategoryDto) {
    return this.menu.createCategory(tenantId, dto);
  }

  @Put('categories/:id')
  @Roles('MANAGER')
  updateCategory(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: CategoryDto) {
    return this.menu.updateCategory(tenantId, id, dto);
  }

  @Delete('categories/:id')
  @Roles('MANAGER')
  removeCategory(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.menu.removeCategory(tenantId, id);
  }

  @Post('categories/sort')
  @Roles('MANAGER')
  sortCategories(@TenantId() tenantId: string, @Body() dto: SortDto) {
    return this.menu.sortCategories(tenantId, dto);
  }

  @Get('products')
  listProducts(
    @TenantId() tenantId: string,
    @Query('categoryId') categoryId?: string,
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
  ) {
    return this.menu.listProducts(tenantId, { categoryId, keyword, status });
  }

  @Get('products/:id')
  getProduct(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.menu.getProduct(tenantId, id);
  }

  @Post('products')
  @Roles('MANAGER')
  createProduct(@TenantId() tenantId: string, @Body() dto: ProductDto) {
    return this.menu.createProduct(tenantId, dto);
  }

  @Put('products/:id')
  @Roles('MANAGER')
  updateProduct(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: ProductDto) {
    return this.menu.updateProduct(tenantId, id, dto);
  }

  @Patch('products/:id/availability')
  @Roles('STAFF')
  setAvailability(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: AvailabilityDto) {
    return this.menu.setAvailability(tenantId, id, dto);
  }

  @Post('products/:id/duplicate')
  @Roles('MANAGER')
  duplicate(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.menu.duplicateProduct(tenantId, id);
  }

  @Delete('products/:id')
  @Roles('MANAGER')
  removeProduct(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.menu.removeProduct(tenantId, id);
  }
}
