/*
  Warnings:

  - You are about to drop the `EmailTwoFactorChallenge` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserActivityAction" ADD VALUE 'TWO_FACTOR_ENABLED';
ALTER TYPE "UserActivityAction" ADD VALUE 'TWO_FACTOR_DISABLED';

-- DropForeignKey
ALTER TABLE "EmailTwoFactorChallenge" DROP CONSTRAINT "EmailTwoFactorChallenge_userId_fkey";

-- DropTable
DROP TABLE "EmailTwoFactorChallenge";

-- CreateTable
CREATE TABLE "user_notification_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "loginNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "passwordChangedNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sessionsFinishedNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "twoFactorNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "marketingEmailsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_two_factor_challenges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_two_factor_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_notification_settings_userId_key" ON "user_notification_settings"("userId");

-- CreateIndex
CREATE INDEX "user_notification_settings_userId_idx" ON "user_notification_settings"("userId");

-- CreateIndex
CREATE INDEX "email_two_factor_challenges_userId_idx" ON "email_two_factor_challenges"("userId");

-- CreateIndex
CREATE INDEX "email_two_factor_challenges_expiresAt_idx" ON "email_two_factor_challenges"("expiresAt");

-- AddForeignKey
ALTER TABLE "user_notification_settings" ADD CONSTRAINT "user_notification_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_two_factor_challenges" ADD CONSTRAINT "email_two_factor_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
