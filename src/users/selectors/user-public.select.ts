import type { Prisma } from '@prisma/client';

export const userPublicSelect = {
  id: true,
  login: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  avatarKey: true,
  position: true,
  about: true,
  emailVerifiedAt: true,
  theme: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{
  select: typeof userPublicSelect;
}>;
