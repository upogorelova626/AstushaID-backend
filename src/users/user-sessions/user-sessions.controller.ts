import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { CurrentUserPayload } from '../../auth/types/current-user.type';
import { UserSessionsService } from './user-sessions.service';

@ApiTags('User sessions')
@Controller('users/me/sessions')
@UseGuards(JwtAuthGuard)
@ApiCookieAuth('accessToken')
export class UserSessionsController {
  constructor(private readonly userSessionsService: UserSessionsService) {}

  @Get()
  @ApiOkResponse({
    description: 'Активные сессии текущего пользователя',
  })
  @ApiUnauthorizedResponse({
    description: 'Пользователь не авторизован',
  })
  getMySessions(@CurrentUser() user: CurrentUserPayload) {
    return this.userSessionsService.getMySessions(user.id, user.sessionId);
  }

  @Delete('others')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    description: 'Все другие сессии завершены',
  })
  @ApiUnauthorizedResponse({
    description: 'Пользователь не авторизован',
  })
  async terminateOtherSessions(
    @CurrentUser() user: CurrentUserPayload,
    @Req() request: Request,
  ): Promise<void> {
    await this.userSessionsService.terminateOtherSessions(
      user.id,
      user.sessionId,
      request,
    );
  }

  @Delete(':sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    description: 'Сессия завершена',
  })
  @ApiUnauthorizedResponse({
    description: 'Пользователь не авторизован',
  })
  async terminateSession(
    @CurrentUser() user: CurrentUserPayload,
    @Param('sessionId') sessionId: string,
    @Req() request: Request,
  ): Promise<void> {
    await this.userSessionsService.terminateSession(
      user.id,
      user.sessionId,
      sessionId,
      request,
    );
  }
}
