-- CreateEnum
CREATE TYPE "UserActivityAction" AS ENUM ('LOGIN', 'PASSWORD_CHANGED', 'SESSION_TERMINATED', 'ALL_SESSIONS_TERMINATED', 'ACCOUNT_DELETED');

-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "user_activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "UserActivityAction" NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "location" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_activities_userId_idx" ON "user_activities"("userId");

-- CreateIndex
CREATE INDEX "user_activities_createdAt_idx" ON "user_activities"("createdAt");

-- CreateIndex
CREATE INDEX "user_activities_userId_createdAt_idx" ON "user_activities"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "sessions_revokedAt_idx" ON "sessions"("revokedAt");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "sessions_userId_revokedAt_idx" ON "sessions"("userId", "revokedAt");

-- AddForeignKey
ALTER TABLE "user_activities" ADD CONSTRAINT "user_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
