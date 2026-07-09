import { Injectable, Logger } from '@nestjs/common';
import { UserNotificationSettings } from '@prisma/client';
import type { Request } from 'express';

import { MailService } from 'src/mail/mail.service';
import { PrismaService } from 'src/prisma/prisma/prisma.service';

type NotificationSettingKey =
  | 'loginNotificationsEnabled'
  | 'passwordChangedNotificationsEnabled'
  | 'sessionsFinishedNotificationsEnabled'
  | 'twoFactorNotificationsEnabled';

@Injectable()
export class UserNotificationsService {
  private readonly logger = new Logger(UserNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  sendLoginNotification(userId: string, request?: Request) {
    return this.sendIfAllowed(userId, 'loginNotificationsEnabled', (email) =>
      this.mailService.sendLoginNotificationEmail(email, {
        userAgent: request ? this.getRequestUserAgent(request) : null,
        ipAddress: request ? this.getRequestIp(request) : null,
      }),
    );
  }

  sendPasswordChangedNotification(userId: string) {
    return this.sendIfAllowed(
      userId,
      'passwordChangedNotificationsEnabled',
      (email) => this.mailService.sendPasswordChangedNotificationEmail(email),
    );
  }

  sendSessionsFinishedNotification(userId: string) {
    return this.sendIfAllowed(
      userId,
      'sessionsFinishedNotificationsEnabled',
      (email) => this.mailService.sendSessionsFinishedNotificationEmail(email),
    );
  }

  sendTwoFactorChangedNotification(userId: string, enabled: boolean) {
    return this.sendIfAllowed(
      userId,
      'twoFactorNotificationsEnabled',
      (email) =>
        this.mailService.sendTwoFactorChangedNotificationEmail(email, enabled),
    );
  }

  private async sendIfAllowed(
    userId: string,
    settingKey: NotificationSettingKey,
    sendEmail: (email: string) => Promise<unknown>,
  ) {
    try {
      const { email, settings } = await this.getUserWithSettings(userId);

      if (!settings.emailNotificationsEnabled || !settings[settingKey]) {
        return;
      }

      await sendEmail(email);
    } catch (error) {
      this.logger.error(
        'Failed to send user notification',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async getUserWithSettings(userId: string): Promise<{
    email: string;
    settings: UserNotificationSettings;
  }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: {
        id: userId,
      },
      select: {
        email: true,
        notificationSettings: true,
      },
    });

    const settings =
      user.notificationSettings ??
      (await this.prisma.userNotificationSettings.upsert({
        where: {
          userId,
        },
        update: {},
        create: {
          userId,
        },
      }));

    return {
      email: user.email,
      settings,
    };
  }

  private getRequestUserAgent(request: Request) {
    const userAgent = request.headers['user-agent'];

    if (Array.isArray(userAgent)) {
      return userAgent.join(' ');
    }

    return userAgent ?? null;
  }

  private getRequestIp(request: Request) {
    const forwardedFor = request.headers['x-forwarded-for'];

    if (Array.isArray(forwardedFor)) {
      return forwardedFor[0] ?? null;
    }

    if (typeof forwardedFor === 'string') {
      return forwardedFor.split(',')[0]?.trim() ?? null;
    }

    return request.ip ?? null;
  }
}
