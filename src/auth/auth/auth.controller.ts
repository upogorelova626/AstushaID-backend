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
  ApiBody,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
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
import { CreateAccountDto } from '../dto/create-account.dto';
import { LoginDto } from '../dto/login.dto';
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
    @Res({ passthrough: true }) response: Response,
  ) {
    const authResponse = await this.authService.createAccount(dto);

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
    @Res({ passthrough: true }) response: Response,
  ) {
    const authResponse = await this.authService.login(dto);

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
  async logout(
    @Req() request: RequestWithCookies,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const refreshToken = request.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

    await this.authService.logout(refreshToken);

    this.clearAuthCookies(response);
  }

  private setAuthCookies(
    response: Response,
    tokens: {
      accessToken: string;
      refreshToken: string;
    },
  ): void {
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

  private clearAuthCookies(response: Response): void {
    response.clearCookie(ACCESS_TOKEN_COOKIE_NAME, {
      path: '/',
    });

    response.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
      path: '/',
    });
  }
}
