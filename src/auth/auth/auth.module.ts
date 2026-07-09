import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { MailModule } from '../../mail/mail.module';
import { UserActivityModule } from '../../users/user-activity/user-activity.module';
import { UserNotificationsModule } from '../../users/user-notifications/user-notifications.module';
import { UsersModule } from '../../users/users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    UsersModule,
    UserActivityModule,
    UserNotificationsModule,
    MailModule,
    JwtModule.register({
      global: true,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
