import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePayConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  appId?: string;

  @IsOptional()
  @IsString()
  appSecret?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  mchId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  serialNo?: string;

  /** APIv3 密钥，32 位 */
  @IsOptional()
  @IsString()
  apiV3Key?: string;

  /** 商户 API 私钥 PEM 内容 */
  @IsOptional()
  @IsString()
  privateKey?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class MiniprogramConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  appId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  appSecret?: string;

  /** release 正式版 / trial 体验版 / develop 开发版 */
  @IsIn(['release', 'trial', 'develop'])
  envVersion: string;
}

export class RefundDto {
  @IsString()
  @IsNotEmpty({ message: '请选择订单' })
  orderId: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  reason?: string;
}
