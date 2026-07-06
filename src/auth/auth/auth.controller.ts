import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';

import {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from '../constants/auth-cookie.constants';
import { ConfirmPasswordResetDto } from '../dto/confirm-password-reset.dto';
import { CreateAccountDto } from '../dto/create-account.dto';
import { LoginDto } from '../dto/login.dto';
import { RequestPasswordResetDto } from '../dto/request-password-reset.dto';
import { VerifyEmailTwoFactorDto } from '../dto/verify-email-two-factor.dto';
import { AuthService } from './auth.service';

interface RequestWithCookies extends Request {
  cookies: Record<string, string | undefined>;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('create-account')
  @ApiBody({ type: CreateAccountDto })
  @ApiCreatedResponse({
    description: 'Аккаунт успешно создан',
  })
  @ApiConflictResponse({
    description: 'Пользователь с таким email или логином уже существует',
  })
  async createAccount(
    @Body() dto: CreateAccountDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const authResponse = await this.authService.createAccount(dto, request);

    this.setAuthCookies(response, authResponse.tokens);

    return authResponse.user;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Пользователь успешно вошёл в аккаунт',
  })
  @ApiUnauthorizedResponse({
    description: 'Неверный логин или пароль',
  })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const authResponse = await this.authService.login(dto, request);

    if ('twoFactorRequired' in authResponse) {
      return authResponse;
    }

    this.setAuthCookies(response, authResponse.tokens);

    return authResponse.user;
  }

  @Post('two-factor/email/verify')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: VerifyEmailTwoFactorDto })
  @ApiOkResponse({
    description: 'Код подтверждения успешно проверен',
  })
  @ApiUnauthorizedResponse({
    description: 'Код подтверждения недействителен',
  })
  async verifyEmailTwoFactor(
    @Body() dto: VerifyEmailTwoFactorDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const authResponse = await this.authService.verifyEmailTwoFactor(
      dto,
      request,
    );

    this.setAuthCookies(response, authResponse.tokens);

    return authResponse.user;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('refreshToken')
  @ApiOkResponse({
    description: 'Токены успешно обновлены',
  })
  @ApiUnauthorizedResponse({
    description: 'Refresh token недействителен',
  })
  async refresh(
    @Req() request: RequestWithCookies,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

    const authResponse = await this.authService.refresh(refreshToken);

    this.setAuthCookies(response, authResponse.tokens);

    return authResponse.user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth('refreshToken')
  @ApiNoContentResponse({
    description: 'Пользователь успешно вышел из аккаунта',
  })
  async logout(
    @Req() request: RequestWithCookies,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

    await this.authService.logout(refreshToken);

    this.clearAuthCookies(response);
  }

  @Post('password-reset/request')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBody({ type: RequestPasswordResetDto })
  @ApiNoContentResponse({
    description: 'Письмо для сброса пароля отправлено, если email существует',
  })
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    await this.authService.requestPasswordReset(dto);
  }

  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBody({ type: ConfirmPasswordResetDto })
  @ApiNoContentResponse({
    description: 'Пароль успешно изменён',
  })
  @ApiBadRequestResponse({
    description: 'Ссылка для сброса пароля недействительна или устарела',
  })
  async confirmPasswordReset(@Body() dto: ConfirmPasswordResetDto) {
    await this.authService.confirmPasswordReset(dto);
  }

  private setAuthCookies(
    response: Response,
    tokens: {
      accessToken: string;
      refreshToken: string;
    },
  ) {
    response.cookie(
      ACCESS_TOKEN_COOKIE_NAME,
      tokens.accessToken,
      accessTokenCookieOptions,
    );

    response.cookie(
      REFRESH_TOKEN_COOKIE_NAME,
      tokens.refreshToken,
      refreshTokenCookieOptions,
    );
  }

  private clearAuthCookies(response: Response) {
    response.clearCookie(ACCESS_TOKEN_COOKIE_NAME, {
      path: '/',
    });

    response.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
      path: '/',
    });
  }
}
