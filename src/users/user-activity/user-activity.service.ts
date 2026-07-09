import { Injectable } from '@nestjs/common';
import { UserActivityAction } from '@prisma/client';
import { Request } from 'express';

import { PrismaService } from 'src/prisma/prisma/prisma.service';

@Injectable()
export class UserActivityService {
  constructor(private readonly prisma: PrismaService) {}

  createActivity(
    userId: string,
    action: UserActivityAction,
    request?: Request,
  ) {
    return this.prisma.userActivity.create({
      data: {
        userId,
        action,
        userAgent: request?.headers['user-agent'] ?? null,
        ipAddress: request ? this.getRequestIp(request) : null,
        location: 'Неизвестно',
      },
    });
  }

  async getMyActivity(userId: string) {
    const activities = await this.prisma.userActivity.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });

    return activities.map((activity) => ({
      id: activity.id,
      time: activity.createdAt,
      device: this.getDeviceName(activity.userAgent),
      action: activity.action,
      actionLabel: this.getActionLabel(activity.action),
      location: activity.location ?? 'Неизвестно',
      ipAddress: activity.ipAddress,
    }));
  }

  private getActionLabel(action: UserActivityAction) {
    const labels: Record<UserActivityAction, string> = {
      LOGIN: 'Вход в аккаунт',
      PASSWORD_CHANGED: 'Изменение пароля',
      SESSION_TERMINATED: 'Завершение сессии',
      ALL_SESSIONS_TERMINATED: 'Завершение других сессий',
      TWO_FACTOR_ENABLED: 'Включение двухфакторной аутентификации',
      TWO_FACTOR_DISABLED: 'Отключение двухфакторной аутентификации',
      ACCOUNT_DELETED: 'Удаление аккаунта',
    };

    return labels[action];
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

  private getRequestIp(request: Request) {
    const forwardedFor = request.headers['x-forwarded-for'];

    if (typeof forwardedFor === 'string') {
      return forwardedFor.split(',')[0].trim();
    }

    return request.ip;
  }
}
