import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthUser } from '../../common/types';
import { CurrentUser, Public } from '../../common/decorators';
import { AuthService } from './auth.service';
import { ChangePasswordDto, PlatformLoginDto, StaffLoginDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  staffLogin(@Body() dto: StaffLoginDto) {
    return this.auth.staffLogin(dto);
  }

  @Public()
  @Post('platform/login')
  platformLogin(@Body() dto: PlatformLoginDto) {
    return this.auth.platformLogin(dto);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user);
  }

  @Post('password')
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user, dto);
  }
}
