import { IsString, Length } from 'class-validator';

export class VerifyEmailTwoFactorDto {
  @IsString()
  challengeId!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}
