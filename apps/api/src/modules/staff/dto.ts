import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateStaffDto {
  @IsString()
  @IsNotEmpty({ message: '请输入登录账号' })
  @MaxLength(30)
  username: string;

  @IsString()
  @MinLength(6, { message: '密码至少 6 位' })
  @MaxLength(32)
  password: string;

  @IsString()
  @IsNotEmpty({ message: '请输入姓名' })
  @MaxLength(20)
  name: string;

  @IsOptional()
  @IsIn(['OWNER', 'MANAGER', 'STAFF'])
  role?: string;
}

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  name?: string;

  @IsOptional()
  @IsIn(['OWNER', 'MANAGER', 'STAFF'])
  role?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'DISABLED'])
  status?: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(6, { message: '密码至少 6 位' })
  @MaxLength(32)
  password: string;
}
