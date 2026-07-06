-- AlterTable
ALTER TABLE "users" ADD COLUMN     "emailTwoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "EmailTwoFactorChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailTwoFactorChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailTwoFactorChallenge_userId_idx" ON "EmailTwoFactorChallenge"("userId");

-- CreateIndex
CREATE INDEX "EmailTwoFactorChallenge_expiresAt_idx" ON "EmailTwoFactorChallenge"("expiresAt");

-- AddForeignKey
ALTER TABLE "EmailTwoFactorChallenge" ADD CONSTRAINT "EmailTwoFactorChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
