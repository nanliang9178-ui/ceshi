import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateTableDto {
  @IsString()
  @IsNotEmpty({ message: '请输入桌号' })
  @MaxLength(20)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  area?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  seats?: number;
}

export class BatchCreateTableDto {
  @IsString()
  @IsNotEmpty({ message: '请输入区域名称' })
  @MaxLength(20)
  area: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  prefix?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  start: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200, { message: '单次最多创建 200 个桌位' })
  count: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  seats?: number;
}

export class UpdateTableDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  area?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  seats?: number;
}
