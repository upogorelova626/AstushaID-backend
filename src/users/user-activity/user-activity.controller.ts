import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UserActivityService } from './user-activity.service';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
  };
};

@Controller('users/me/activity')
@UseGuards(JwtAuthGuard)
export class UserActivityController {
  constructor(private readonly userActivityService: UserActivityService) {}

  @Get()
  getMyActivity(@Req() request: AuthenticatedRequest) {
    return this.userActivityService.getMyActivity(request.user.id);
  }
}
