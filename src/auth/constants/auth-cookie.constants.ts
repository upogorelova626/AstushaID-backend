import type { CookieOptions } from 'express';

export const ACCESS_TOKEN_COOKIE_NAME = 'accessToken';
export const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';

export const accessTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: false,
  sameSite: 'lax',
  path: '/',
  maxAge: 24 * 60 * 60 * 1000,
};

export const refreshTokenCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: false,
  sameSite: 'lax',
  path: '/',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};
