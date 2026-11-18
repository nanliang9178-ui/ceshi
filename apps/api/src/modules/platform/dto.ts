import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty({ message: '请输入商户名称' })
  @MaxLength(40)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone?: string;

  @IsOptional()
  @IsDateString({}, { message: '到期时间格式不正确' })
  expireAt?: string;

  @IsOptional()
  @IsIn(['BASIC', 'PRO', 'FLAGSHIP'])
  plan?: string;

  @IsString()
  @IsNotEmpty({ message: '请输入店主登录账号' })
  @MaxLength(30)
  ownerUsername: string;

  @IsString()
  @MinLength(6, { message: '初始密码至少 6 位' })
  ownerPassword: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  storeName?: string;
}

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED'])
  status?: string;

  @IsOptional()
  @IsIn(['BASIC', 'PRO', 'FLAGSHIP'])
  plan?: string;

  @IsOptional()
  @IsDateString()
  expireAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  remark?: string;
}

export class TenantListQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class ResetOwnerPasswordDto {
  @IsString()
  @MinLength(6)
  password: string;
}

export class ToggleTenantDto {
  @IsBoolean()
  enabled: boolean;
}

export class PlatformStatsQueryDto {
  @IsOptional()
  @Type(() => String)
  range?: string;
}
