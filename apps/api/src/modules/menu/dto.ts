import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CategoryDto {
  @IsString()
  @IsNotEmpty({ message: '请输入分类名称' })
  @MaxLength(20, { message: '分类名称最多 20 字' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  icon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  promoLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  promoTitle?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort?: number;

  @IsOptional()
  @IsIn(['ON', 'OFF'])
  status?: string;
}

export class SpecOptionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  priceDelta?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort?: number;

  @IsOptional()
  @IsBoolean()
  defaultSelected?: boolean;
}

export class SpecGroupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsBoolean()
  multiple?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpecOptionDto)
  options: SpecOptionDto[];
}

export class ProductDto {
  @IsString()
  @IsNotEmpty({ message: '请选择分类' })
  categoryId: string;

  @IsString()
  @IsNotEmpty({ message: '请输入菜品名称' })
  @MaxLength(40, { message: '菜品名称最多 40 字' })
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @Type(() => Number)
  @IsInt({ message: '价格必须为整数分' })
  @Min(0)
  price: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  originalPrice?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  unit?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  stockEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsBoolean()
  soldOut?: boolean;

  @IsOptional()
  @IsIn(['ON', 'OFF'])
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SpecGroupDto)
  specGroups?: SpecGroupDto[];
}

export class AvailabilityDto {
  @IsOptional()
  @IsBoolean()
  soldOut?: boolean;

  @IsOptional()
  @IsIn(['ON', 'OFF'])
  status?: string;
}

export class SortDto {
  @IsArray()
  @Type(() => String)
  ids: string[];
}
