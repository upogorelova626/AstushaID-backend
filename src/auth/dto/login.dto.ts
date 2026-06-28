import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'astusha@test.com',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  loginOrEmail!: string;

  @ApiProperty({
    example: '12345678',
    minLength: 8,
    maxLength: 64,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(64)
  password!: string;
}
