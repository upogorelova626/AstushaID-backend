import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import { ACCESS_TOKEN_COOKIE_NAME } from '../constants/auth-cookie.constants';
import type { CurrentUserPayload } from '../types/current-user.type';
import type { AccessTokenPayload } from '../types/token-payload.type';

interface RequestWithAuthCookies extends Request {
  cookies: Record<string, string | undefined>;
  user?: CurrentUserPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAuthCookies>();

    const accessToken = request.cookies?.[ACCESS_TOKEN_COOKIE_NAME];

    if (!accessToken) {
      throw new UnauthorizedException('Пользователь не авторизован');
    }

    try {
      const payload: AccessTokenPayload =
        await this.jwtService.verifyAsync<AccessTokenPayload>(accessToken, {
          secret:
            process.env.JWT_ACCESS_SECRET ?? 'astusha_id_access_secret_dev',
        });

      request.user = {
        id: payload.sub,
        email: payload.email,
        login: payload.login,
        sessionId: payload.sessionId,
      };

      return true;
    } catch {
      throw new UnauthorizedException('Пользователь не авторизован');
    }
  }
}
