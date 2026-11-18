import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpdateStoreDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  businessHours?: string;

  @IsOptional()
  @IsBoolean()
  openStatus?: boolean;

  @IsOptional()
  @IsBoolean()
  autoAccept?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  packingFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  deliveryFee?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  deliveryMinAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  deliveryRange?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  deliveryEta?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fullReduceThreshold?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fullReduceAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  notice?: string;
}

class BannerItemDto {
  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  link?: string;
}

export class UpdateBrandDto {
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  coverUrl?: string;

  @IsOptional()
  @Matches(/^#([0-9a-fA-F]{6})$/, { message: '主题色需为 #RRGGBB 格式' })
  primaryColor?: string;

  @IsOptional()
  @Matches(/^#([0-9a-fA-F]{6})$/, { message: '辅助色需为 #RRGGBB 格式' })
  accentColor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  slogan?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  announcement?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  servicePhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  copyright?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BannerItemDto)
  banners?: BannerItemDto[];
}
