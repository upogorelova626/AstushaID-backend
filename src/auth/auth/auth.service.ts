import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import { UserActivityAction } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomUUID } from 'crypto';
import type { Request } from 'express';

import { PrismaService } from '../../prisma/prisma/prisma.service';
import { UserActivityService } from 'src/users/user-activity/user-activity.sevice';
import { UsersService } from '../../users/users/users.service';
import { CreateAccountDto } from '../dto/create-account.dto';
import { LoginDto } from '../dto/login.dto';
import type { AccessTokenPayload } from '../types/token-payload.type';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly userActivityService: UserActivityService,
  ) {}

  async createAccount(dto: CreateAccountDto, request: Request) {
    const email = dto.email.toLowerCase().trim();
    const login = dto.login.toLowerCase().trim();

    const existingEmailUser = await this.usersService.findByEmail(email);

    if (existingEmailUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const existingLoginUser = await this.usersService.findByLogin(login);

    if (existingLoginUser) {
      throw new ConflictException(
        'Пользователь с таким логином уже существует',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.usersService.createUser({
      login,
      email,
      passwordHash,
    });

    const tokens = await this.createSessionAndTokens(
      {
        userId: user.id,
        email: user.email,
        login: user.login,
      },
      request,
    );

    await this.userActivityService.createActivity(
      user.id,
      UserActivityAction.LOGIN,
      request,
    );

    return {
      user,
      tokens,
    };
  }

  async login(dto: LoginDto, request: Request) {
    const user = await this.usersService.findByLoginOrEmail(dto.loginOrEmail);

    if (!user) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный логин или пароль');
    }

    const publicUser = await this.usersService.findPublicById(user.id);

    const tokens = await this.createSessionAndTokens(
      {
        userId: user.id,
        email: user.email,
        login: user.login,
      },
      request,
    );

    await this.userActivityService.createActivity(
      user.id,
      UserActivityAction.LOGIN,
      request,
    );

    return {
      user: publicUser,
      tokens,
    };
  }

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token отсутствует');
    }

    const refreshTokenHash = this.hashRefreshToken(refreshToken);

    const session = await this.prisma.session.findFirst({
      where: {
        refreshTokenHash,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!session) {
      throw new UnauthorizedException('Сессия недействительна');
    }

    const user = await this.usersService.findPublicById(session.userId);

    const tokens = await this.issueTokens({
      userId: user.id,
      email: user.email,
      login: user.login,
      sessionId: session.id,
    });

    await this.prisma.session.update({
      where: {
        id: session.id,
      },
      data: {
        refreshTokenHash: this.hashRefreshToken(tokens.refreshToken),
        expiresAt: this.getRefreshTokenExpiresAt(),
        lastActiveAt: new Date(),
      },
    });

    return {
      user,
      tokens,
    };
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const refreshTokenHash = this.hashRefreshToken(refreshToken);

    await this.prisma.session.updateMany({
      where: {
        refreshTokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  private async createSessionAndTokens(
    data: {
      userId: string;
      email: string;
      login: string;
    },
    request: Request,
  ): Promise<AuthTokens> {
    const sessionId = randomUUID();

    const tokens = await this.issueTokens({
      userId: data.userId,
      email: data.email,
      login: data.login,
      sessionId,
    });

    await this.prisma.session.create({
      data: {
        id: sessionId,
        userId: data.userId,
        refreshTokenHash: this.hashRefreshToken(tokens.refreshToken),
        userAgent: this.getRequestUserAgent(request),
        ipAddress: this.getRequestIp(request),
        expiresAt: this.getRefreshTokenExpiresAt(),
        lastActiveAt: new Date(),
      },
    });

    return tokens;
  }

  private async issueTokens(data: {
    userId: string;
    email: string;
    login: string;
    sessionId: string;
  }): Promise<AuthTokens> {
    const accessPayload: AccessTokenPayload = {
      sub: data.userId,
      email: data.email,
      login: data.login,
      sessionId: data.sessionId,
    };

    const refreshToken = this.generateRefreshToken();

    const accessExpiresIn = (process.env.JWT_ACCESS_EXPIRES_IN ??
      '1d') as JwtSignOptions['expiresIn'];

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: process.env.JWT_ACCESS_SECRET ?? 'astusha_id_access_secret_dev',
      expiresIn: accessExpiresIn,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private generateRefreshToken(): string {
    return randomBytes(64).toString('hex');
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private getRefreshTokenExpiresAt(): Date {
    const expiresAt = new Date();
    const days = Number(process.env.JWT_REFRESH_EXPIRES_DAYS ?? 30);

    expiresAt.setDate(expiresAt.getDate() + days);

    return expiresAt;
  }

  private getRequestUserAgent(request: Request): string | null {
    const userAgent = request.headers['user-agent'];

    if (Array.isArray(userAgent)) {
      return userAgent.join(' ');
    }

    return userAgent ?? null;
  }

  private getRequestIp(request: Request): string | null {
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
