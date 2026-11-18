import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class StaffLoginDto {
  @IsString()
  @IsNotEmpty({ message: '请输入账号' })
  username: string;

  @IsString()
  @IsNotEmpty({ message: '请输入密码' })
  password: string;

  /** 商户编码，账号在多个商户重复时必须提供 */
  @IsOptional()
  @IsString()
  tenantCode?: string;
}

export class PlatformLoginDto {
  @IsString()
  @IsNotEmpty({ message: '请输入账号' })
  username: string;

  @IsString()
  @IsNotEmpty({ message: '请输入密码' })
  password: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: '请输入原密码' })
  oldPassword: string;

  @IsString()
  @MinLength(6, { message: '新密码至少 6 位' })
  @MaxLength(32, { message: '新密码最长 32 位' })
  newPassword: string;
}
