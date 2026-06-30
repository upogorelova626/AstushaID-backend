import { ApiProperty } from '@nestjs/swagger';
import { UserTheme } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateUserThemeDto {
  @ApiProperty({
    enum: UserTheme,
    example: UserTheme.DARK,
  })
  @IsEnum(UserTheme)
  theme!: UserTheme;
}
