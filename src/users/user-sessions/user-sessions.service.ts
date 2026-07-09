import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserActivityAction } from '@prisma/client';
import type { Request } from 'express';

import { PrismaService } from '../../prisma/prisma/prisma.service';
import { UserActivityService } from '../user-activity/user-activity.service';
import { UserNotificationsService } from '../user-notifications/user-notifications.service';

@Injectable()
export class UserSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userActivityService: UserActivityService,
    private readonly userNotificationsService: UserNotificationsService,
  ) {}

  async getMySessions(userId: string, currentSessionId: string) {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        lastActiveAt: 'desc',
      },
    });

    return sessions.map((session) => ({
      id: session.id,
      device: this.getDeviceName(session.userAgent),
      location: 'Неизвестно',
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      lastActiveAt: session.lastActiveAt,
      createdAt: session.createdAt,
      isCurrent: session.id === currentSessionId,
      icon: this.getSessionIcon(session.userAgent),
    }));
  }

  async terminateSession(
    userId: string,
    currentSessionId: string,
    sessionId: string,
    request: Request,
  ) {
    if (sessionId === currentSessionId) {
      throw new BadRequestException('Нельзя завершить текущую сессию');
    }

    const result = await this.prisma.session.updateMany({
      where: {
        id: sessionId,
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    if (!result.count) {
      throw new NotFoundException('Сессия не найдена');
    }

    await this.userActivityService.createActivity(
      userId,
      UserActivityAction.SESSION_TERMINATED,
      request,
    );

    void this.userNotificationsService.sendSessionsFinishedNotification(userId);
  }

  async terminateOtherSessions(
    userId: string,
    currentSessionId: string,
    request: Request,
  ) {
    const result = await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
        id: {
          not: currentSessionId,
        },
      },
      data: {
        revokedAt: new Date(),
      },
    });

    if (!result.count) {
      return;
    }

    await this.userActivityService.createActivity(
      userId,
      UserActivityAction.ALL_SESSIONS_TERMINATED,
      request,
    );

    void this.userNotificationsService.sendSessionsFinishedNotification(userId);
  }

  private getDeviceName(userAgent: string | null) {
    if (!userAgent) {
      return 'Неизвестное устройство';
    }

    const os = this.getOsName(userAgent);
    const browser = this.getBrowserName(userAgent);

    return `${os} · ${browser}`;
  }

  private getOsName(userAgent: string) {
    if (userAgent.includes('Windows')) {
      return 'Windows';
    }

    if (userAgent.includes('Mac OS')) {
      return 'macOS';
    }

    if (userAgent.includes('iPhone')) {
      return 'iPhone';
    }

    if (userAgent.includes('Android')) {
      return 'Android';
    }

    if (userAgent.includes('Linux')) {
      return 'Linux';
    }

    return 'Неизвестное устройство';
  }

  private getBrowserName(userAgent: string) {
    if (userAgent.includes('Edg/')) {
      return 'Edge';
    }

    if (userAgent.includes('OPR/') || userAgent.includes('Opera/')) {
      return 'Opera';
    }

    if (userAgent.includes('Chrome/')) {
      return 'Chrome';
    }

    if (userAgent.includes('Firefox/')) {
      return 'Firefox';
    }

    if (userAgent.includes('Safari/')) {
      return 'Safari';
    }

    return 'Неизвестный браузер';
  }

  private getSessionIcon(userAgent: string | null) {
    if (!userAgent) {
      return '@tui.monitor';
    }

    if (
      userAgent.includes('iPhone') ||
      userAgent.includes('Android') ||
      userAgent.includes('Mobile')
    ) {
      return '@tui.smartphone';
    }

    if (userAgent.includes('Mac OS')) {
      return '@tui.laptop';
    }

    return '@tui.monitor';
  }
}
