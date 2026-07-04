import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserActivityAction } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import type { Request } from 'express';

import { PrismaService } from 'src/prisma/prisma/prisma.service';
import { UserActivityService } from '../user-activity/user-activity.sevice';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { DeleteAccountDto } from '../dto/delete-account.dto';
import { UpdateCurrentUserDto } from '../dto/update-current-user.dto';
import { UpdateUserThemeDto } from '../dto/update-theme.dto';
import { userPublicSelect } from '../selectors/user-public.select';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userActivityService: UserActivityService,
  ) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findByLogin(login: string) {
    return this.prisma.user.findUnique({
      where: { login },
    });
  }

  findByLoginOrEmail(loginOrEmail: string) {
    const value = loginOrEmail.toLowerCase().trim();

    return this.prisma.user.findFirst({
      where: {
        OR: [
          {
            email: value,
          },
          {
            login: value,
          },
        ],
      },
    });
  }

  async findPublicById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userPublicSelect,
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return user;
  }

  createUser(data: { login: string; email: string; passwordHash: string }) {
    return this.prisma.user.create({
      data,
      select: userPublicSelect,
    });
  }

  async updateCurrentUser(userId: string, dto: UpdateCurrentUserDto) {
    try {
      return await this.prisma.user.update({
        where: {
          id: userId,
        },
        data: dto,
        select: userPublicSelect,
      });
    } catch {
      throw new NotFoundException('Пользователь не найден');
    }
  }

  async updateTheme(userId: string, dto: UpdateUserThemeDto) {
    await this.findPublicById(userId);

    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        theme: dto.theme,
      },
      select: userPublicSelect,
    });
  }

  async changePassword(
    userId: string,
    currentSessionId: string,
    dto: ChangePasswordDto,
    request: Request,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Текущий пароль указан неверно');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          passwordHash,
        },
      }),

      this.prisma.session.updateMany({
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
      }),
    ]);

    await this.userActivityService.createActivity(
      userId,
      UserActivityAction.PASSWORD_CHANGED,
      request,
    );
  }

  async deleteAccount(userId: string, dto: DeleteAccountDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Пароль указан неверно');
    }

    await this.prisma.user.delete({
      where: {
        id: userId,
      },
    });
  }
}
