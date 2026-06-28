import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { CurrentUserPayload } from '../types/current-user.type';

interface RequestWithUser {
  user: CurrentUserPayload;
}

export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext): CurrentUserPayload => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    return request.user;
  },
);
