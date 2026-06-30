import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { CurrentUserPayload } from '../../auth/types/current-user.type';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { UpdateCurrentUserDto } from '../dto/update-current-user.dto';
import { UsersService } from './users.service';
import { DeleteAccountDto } from '../dto/delete-account.dto';
import { UpdateUserThemeDto } from '../dto/update-theme.dto';

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

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('accessToken')
  @ApiBody({
    type: UpdateCurrentUserDto,
  })
  @ApiOkResponse({
    description: 'Профиль текущего пользователя обновлён',
  })
  @ApiUnauthorizedResponse({
    description: 'Пользователь не авторизован',
  })
  updateMe(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateCurrentUserDto,
  ) {
    return this.usersService.updateCurrentUser(user.id, dto);
  }

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('accessToken')
  @ApiBody({
    type: ChangePasswordDto,
  })
  @ApiNoContentResponse({
    description: 'Пароль успешно изменён',
  })
  @ApiUnauthorizedResponse({
    description: 'Пользователь не авторизован или текущий пароль неверный',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.usersService.changePassword(user.id, user.sessionId, dto);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('accessToken')
  @ApiBody({
    type: DeleteAccountDto,
  })
  @ApiNoContentResponse({
    description: 'Аккаунт успешно удалён',
  })
  @ApiUnauthorizedResponse({
    description: 'Пользователь не авторизован или пароль неверный',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMe(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: DeleteAccountDto,
  ): Promise<void> {
    await this.usersService.deleteAccount(user.id, dto);
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

  @Patch('me/theme')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('accessToken')
  @ApiBody({
    type: UpdateUserThemeDto,
  })
  @ApiOkResponse({
    description: 'Тема текущего пользователя обновлена',
  })
  @ApiUnauthorizedResponse({
    description: 'Пользователь не авторизован',
  })
  updateTheme(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateUserThemeDto,
  ) {
    return this.usersService.updateTheme(user.id, dto);
  }
}
