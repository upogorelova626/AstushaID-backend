import { Injectable } from '@nestjs/common';
import { UserNotificationSettings } from '@prisma/client';

import { PrismaService } from 'src/prisma/prisma/prisma.service';
import { UpdateUserNotificationSettingsDto } from './dto/update-user-notification-settings.dto';

@Injectable()
export class UserNotificationSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(userId: string) {
    const settings = await this.prisma.userNotificationSettings.upsert({
      where: {
        userId,
      },
      update: {},
      create: {
        userId,
      },
    });

    return this.mapSettings(settings);
  }

  async updateSettings(userId: string, dto: UpdateUserNotificationSettingsDto) {
    const settings = await this.prisma.userNotificationSettings.upsert({
      where: {
        userId,
      },
      update: dto,
      create: {
        userId,
        ...dto,
      },
    });

    return this.mapSettings(settings);
  }

  private mapSettings(settings: UserNotificationSettings) {
    return {
      emailNotificationsEnabled: settings.emailNotificationsEnabled,
      pushNotificationsEnabled: settings.pushNotificationsEnabled,
      telegramNotificationsEnabled: settings.telegramNotificationsEnabled,
      loginNotificationsEnabled: settings.loginNotificationsEnabled,
      passwordChangedNotificationsEnabled:
        settings.passwordChangedNotificationsEnabled,
      sessionsFinishedNotificationsEnabled:
        settings.sessionsFinishedNotificationsEnabled,
      twoFactorNotificationsEnabled: settings.twoFactorNotificationsEnabled,
      marketingEmailsEnabled: settings.marketingEmailsEnabled,
    };
  }
}
