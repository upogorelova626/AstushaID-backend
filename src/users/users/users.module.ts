import { Module } from '@nestjs/common';

import { S3Module } from 'src/s3/s3.module';

import { UserActivityModule } from '../user-activity/user-activity.module';
import { UserNotificationSettingsController } from '../user-notification-settings/user-notification-settings.controller';
import { UserNotificationSettingsService } from '../user-notification-settings/user-notification-settings.service';
import { UserNotificationsModule } from '../user-notifications/user-notifications.module';
import { UserSessionsModule } from '../user-sessions/user-sessions.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    UserActivityModule,
    UserSessionsModule,
    UserNotificationsModule,
    S3Module,
  ],
  controllers: [UsersController, UserNotificationSettingsController],
  providers: [UsersService, UserNotificationSettingsService],
  exports: [UsersService, UserNotificationSettingsService],
})
export class UsersModule {}
