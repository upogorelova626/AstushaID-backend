import { Module } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma/prisma.service';
import { UserActivityModule } from '../user-activity/user-activity.module';
import { UserSessionsController } from './user-sessions.controller';
import { UserSessionsService } from './user-sessions.service';
import { UserNotificationsModule } from '../user-notifications/user-notifications.module';

@Module({
  imports: [UserActivityModule, UserNotificationsModule],
  controllers: [UserSessionsController],
  providers: [UserSessionsService, PrismaService],
})
export class UserSessionsModule {}
