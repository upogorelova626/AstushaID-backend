import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { CurrentUserPayload } from '../../auth/types/current-user.type';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('accessToken')
  @ApiOkResponse({
    description: 'Текущий пользователь',
  })
  @ApiUnauthorizedResponse({
    description: 'Пользователь не авторизован',
  })
  getMe(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.findPublicById(user.id);
  }

  @Get(':userId')
  @ApiOkResponse({
    description: 'Публичная информация о пользователе',
  })
  @ApiNotFoundResponse({
    description: 'Пользователь не найден',
  })
  findById(@Param('userId') userId: string) {
    return this.usersService.findPublicById(userId);
  }
}
