import { Module } from '@nestjs/common';
import { H5Controller } from './h5.controller';
import { H5Service } from './h5.service';

@Module({
  controllers: [H5Controller],
  providers: [H5Service],
})
export class H5Module {}
