import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma/prisma.service';
import { UpdateCurrentUserDto } from '../dto/update-current-user.dto';
import { userPublicSelect } from '../selectors/user-public.select';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
    await this.findPublicById(userId);

    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data: dto,
      select: userPublicSelect,
    });
  }
}
