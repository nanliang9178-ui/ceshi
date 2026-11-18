import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class OrderItemInputDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1, { message: '数量至少为 1' })
  @Max(99, { message: '单项最多 99 份' })
  quantity: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specOptionIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(60)
  remark?: string;
}

export class CreateOrderDto {
  @IsOptional()
  @IsString()
  tableId?: string;

  /** 扫码进入时携带的桌码 scene */
  @IsOptional()
  @IsString()
  sceneCode?: string;

  @IsOptional()
  @IsIn(['DINE_IN', 'TAKEAWAY', 'DELIVERY'])
  type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  peopleCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;

  /** 外卖收货人 */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  receiverName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  receiverPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  address?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items: OrderItemInputDto[];

  /** 幂等键：同一键重复提交返回同一订单 */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  idempotencyKey?: string;
}

export class AppendItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items: OrderItemInputDto[];
}

export class OrderListQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}

export class CancelOrderDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  reason?: string;
}
