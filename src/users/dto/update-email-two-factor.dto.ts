import { IsBoolean } from 'class-validator';

export class UpdateEmailTwoFactorDto {
  @IsBoolean()
  enabled!: boolean;
}
