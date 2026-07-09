import { Module } from '@nestjs/common';

import { MailModule } from 'src/mail/mail.module';
import { PrismaService } from 'src/prisma/prisma/prisma.service';

import { UserNotificationsService } from './user-notifications.service';

@Module({
  imports: [MailModule],
  providers: [UserNotificationsService, PrismaService],
  exports: [UserNotificationsService],
})
export class UserNotificationsModule {}
