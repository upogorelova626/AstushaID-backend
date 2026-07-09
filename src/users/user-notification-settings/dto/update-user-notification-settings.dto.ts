import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateUserNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  emailNotificationsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNotificationsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  telegramNotificationsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  loginNotificationsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  passwordChangedNotificationsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  sessionsFinishedNotificationsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  twoFactorNotificationsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  marketingEmailsEnabled?: boolean;
}
