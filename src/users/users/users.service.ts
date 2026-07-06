import 'multer';

import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserActivityAction } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import type { Request } from 'express';

import { PrismaService } from 'src/prisma/prisma/prisma.service';
import { S3Service } from 'src/s3/s3.service';

import { ChangePasswordDto } from '../dto/change-password.dto';
import { DeleteAccountDto } from '../dto/delete-account.dto';
import { UpdateCurrentUserDto } from '../dto/update-current-user.dto';
import { UpdateUserThemeDto } from '../dto/update-theme.dto';
import { userPublicSelect } from '../selectors/user-public.select';
import { UserActivityService } from '../user-activity/user-activity.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userActivityService: UserActivityService,
    private readonly s3Service: S3Service,
  ) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: {
        email,
      },
    });
  }

  findByLogin(login: string) {
    return this.prisma.user.findUnique({
      where: {
        login,
      },
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
      where: {
        id,
      },
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

  async updateMyAvatar(userId: string, file: Express.Multer.File) {
    this.validateAvatar(file);

    const user = await this.prisma.user.findUniqueOrThrow({
      where: {
        id: userId,
      },
      select: {
        avatarKey: true,
      },
    });

    const avatar = await this.s3Service.uploadUserAvatar(userId, file);

    const updatedUser = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        avatarUrl: avatar.url,
        avatarKey: avatar.key,
      },
      select: userPublicSelect,
    });

    if (user.avatarKey) {
      await this.s3Service.deleteFile(user.avatarKey);
    }

    return updatedUser;
  }

  async deleteMyAvatar(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: {
        id: userId,
      },
      select: {
        avatarKey: true,
      },
    });

    if (user.avatarKey) {
      await this.s3Service.deleteFile(user.avatarKey);
    }

    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        avatarUrl: null,
        avatarKey: null,
      },
      select: userPublicSelect,
    });
  }

  private validateAvatar(file: Express.Multer.File) {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Можно загрузить только JPEG, PNG или WEBP',
      );
    }
  }
}
