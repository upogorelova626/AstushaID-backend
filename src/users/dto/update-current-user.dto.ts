import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCurrentUserDto {
  @ApiPropertyOptional({
    example: 'Никита',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Петров',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({
    example: 'Angular Developer',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string;

  @ApiPropertyOptional({
    example: 'Пишу Astusha ecosystem',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  about?: string;
}
