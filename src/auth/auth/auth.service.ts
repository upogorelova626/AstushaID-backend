import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtSignOptions } from '@nestjs/jwt';
import { UserActivityAction } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomInt, randomUUID } from 'crypto';
import type { Request } from 'express';
import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../prisma/prisma/prisma.service';
import { UserActivityService } from 'src/users/user-activity/user-activity.service';
import { UserNotificationsService } from 'src/users/user-notifications/user-notifications.service';
import { UsersService } from '../../users/users/users.service';
import { ConfirmPasswordResetDto } from '../dto/confirm-password-reset.dto';
import { CreateAccountDto } from '../dto/create-account.dto';
import { LoginDto } from '../dto/login.dto';
import { RequestPasswordResetDto } from '../dto/request-password-reset.dto';
import { VerifyEmailTwoFactorDto } from '../dto/verify-email-two-factor.dto';
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
    private readonly userNotificationsService: UserNotificationsService,
    private readonly mailService: MailService,
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

    return this.finishLogin(
      {
        id: user.id,
        email: user.email,
        login: user.login,
      },
      request,
    );
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

    if (user.emailTwoFactorEnabled) {
      return this.createEmailTwoFactorChallenge(user, request);
    }

    return this.finishLogin(
      {
        id: user.id,
        email: user.email,
        login: user.login,
      },
      request,
    );
  }

  async verifyEmailTwoFactor(dto: VerifyEmailTwoFactorDto, request: Request) {
    const challenge = await this.prisma.emailTwoFactorChallenge.findUnique({
      where: {
        id: dto.challengeId,
      },
      include: {
        user: true,
      },
    });

    if (!challenge || challenge.usedAt) {
      throw new UnauthorizedException('Код подтверждения недействителен');
    }

    if (challenge.expiresAt < new Date()) {
      throw new UnauthorizedException('Код подтверждения истёк');
    }

    if (challenge.attempts >= 5) {
      throw new UnauthorizedException('Превышено количество попыток');
    }

    const isCodeValid = await bcrypt.compare(dto.code, challenge.codeHash);

    if (!isCodeValid) {
      await this.prisma.emailTwoFactorChallenge.update({
        where: {
          id: challenge.id,
        },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      throw new UnauthorizedException('Неверный код подтверждения');
    }

    await this.prisma.emailTwoFactorChallenge.update({
      where: {
        id: challenge.id,
      },
      data: {
        usedAt: new Date(),
      },
    });

    return this.finishLogin(
      {
        id: challenge.user.id,
        email: challenge.user.email,
        login: challenge.user.login,
      },
      request,
    );
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

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) {
      return;
    }

    const refreshTokenHash = this.hashRefreshToken(refreshToken);

    const session = await this.prisma.session.findFirst({
      where: {
        refreshTokenHash,
        revokedAt: null,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!session) {
      return;
    }

    await this.prisma.session.update({
      where: {
        id: session.id,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    await this.userActivityService.createActivity(
      session.userId,
      UserActivityAction.SESSION_TERMINATED,
    );

    void this.userNotificationsService.sendSessionsFinishedNotification(
      session.userId,
    );
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const email = dto.email.toLowerCase().trim();

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return;
    }

    await this.prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashPasswordResetToken(token);

    const expiresAt = new Date();

    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:4202';
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

    await this.mailService.sendPasswordResetEmail(user.email, resetUrl);
  }

  async confirmPasswordReset(dto: ConfirmPasswordResetDto) {
    const tokenHash = this.hashPasswordResetToken(dto.token);

    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!resetToken) {
      throw new BadRequestException(
        'Ссылка для сброса пароля недействительна или устарела',
      );
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: {
          id: resetToken.userId,
        },
        data: {
          passwordHash,
        },
      }),
      this.prisma.passwordResetToken.update({
        where: {
          id: resetToken.id,
        },
        data: {
          usedAt: new Date(),
        },
      }),
      this.prisma.session.updateMany({
        where: {
          userId: resetToken.userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      }),
    ]);

    await this.userActivityService.createActivity(
      resetToken.userId,
      UserActivityAction.PASSWORD_CHANGED,
    );

    void this.userNotificationsService.sendPasswordChangedNotification(
      resetToken.userId,
    );
  }

  private async finishLogin(
    user: {
      id: string;
      email: string;
      login: string;
    },
    request: Request,
  ) {
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

    void this.userNotificationsService.sendLoginNotification(user.id, request);

    return {
      user: publicUser,
      tokens,
    };
  }

  private async createEmailTwoFactorChallenge(
    user: {
      id: string;
      email: string;
    },
    request: Request,
  ) {
    await this.prisma.emailTwoFactorChallenge.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    const code = this.generateTwoFactorCode();
    const codeHash = await bcrypt.hash(code, 10);

    const expiresAt = new Date();

    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    const challenge = await this.prisma.emailTwoFactorChallenge.create({
      data: {
        userId: user.id,
        codeHash,
        userAgent: this.getRequestUserAgent(request),
        ipAddress: this.getRequestIp(request),
        expiresAt,
      },
    });

    await this.mailService.sendTwoFactorCode(user.email, code);

    return {
      twoFactorRequired: true,
      challengeId: challenge.id,
      email: this.maskEmail(user.email),
    };
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

  private generateTwoFactorCode() {
    return randomInt(100000, 1000000).toString();
  }

  private generateRefreshToken() {
    return randomBytes(64).toString('hex');
  }

  private hashRefreshToken(refreshToken: string) {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  private hashPasswordResetToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private maskEmail(email: string) {
    const [name, domain] = email.split('@');

    if (!name || !domain) {
      return email;
    }

    return `${name.slice(0, 2)}***@${domain}`;
  }

  private getRefreshTokenExpiresAt() {
    const expiresAt = new Date();
    const days = Number(process.env.JWT_REFRESH_EXPIRES_DAYS ?? 30);

    expiresAt.setDate(expiresAt.getDate() + days);

    return expiresAt;
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
