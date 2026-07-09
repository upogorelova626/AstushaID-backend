-- AlterTable
ALTER TABLE "user_notification_settings" ADD COLUMN     "pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "telegramNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false;
