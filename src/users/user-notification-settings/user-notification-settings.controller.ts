import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UpdateUserNotificationSettingsDto } from './dto/update-user-notification-settings.dto';
import { UserNotificationSettingsService } from './user-notification-settings.service';

type RequestWithUser = Request & {
  user: {
    id: string;
  };
};

@Controller('users/me/notification-settings')
@UseGuards(JwtAuthGuard)
export class UserNotificationSettingsController {
  constructor(
    private readonly userNotificationSettingsService: UserNotificationSettingsService,
  ) {}

  @Get()
  getSettings(@Req() req: RequestWithUser) {
    return this.userNotificationSettingsService.getSettings(req.user.id);
  }

  @Patch()
  updateSettings(
    @Req() req: RequestWithUser,
    @Body() dto: UpdateUserNotificationSettingsDto,
  ) {
    return this.userNotificationSettingsService.updateSettings(
      req.user.id,
      dto,
    );
  }
}
