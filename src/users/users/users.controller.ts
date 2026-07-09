import 'multer';

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';

import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

import { ChangePasswordDto } from '../dto/change-password.dto';
import { DeleteAccountDto } from '../dto/delete-account.dto';
import { UpdateCurrentUserDto } from '../dto/update-current-user.dto';
import { UpdateEmailTwoFactorDto } from '../dto/update-email-two-factor.dto';
import { UpdateUserThemeDto } from '../dto/update-theme.dto';
import { UsersService } from './users.service';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    sessionId: string;
  };
};

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@Req() req: AuthenticatedRequest) {
    return this.usersService.findPublicById(req.user.id);
  }

  @Patch('me')
  updateCurrentUser(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateCurrentUserDto,
  ) {
    return this.usersService.updateCurrentUser(req.user.id, dto);
  }

  @Patch('me/theme')
  updateTheme(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateUserThemeDto,
  ) {
    return this.usersService.updateTheme(req.user.id, dto);
  }

  @Patch('me/password')
  changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(
      req.user.id,
      req.user.sessionId,
      dto,
      req,
    );
  }

  @Patch('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  updateMyAvatar(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Файл не передан');
    }

    return this.usersService.updateMyAvatar(req.user.id, file);
  }

  @Delete('me/avatar')
  deleteMyAvatar(@Req() req: AuthenticatedRequest) {
    return this.usersService.deleteMyAvatar(req.user.id);
  }

  @Delete('me')
  deleteAccount(
    @Req() req: AuthenticatedRequest,
    @Body() dto: DeleteAccountDto,
  ) {
    return this.usersService.deleteAccount(req.user.id, dto);
  }

  @Patch('me/two-factor/email')
  updateEmailTwoFactor(
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateEmailTwoFactorDto,
  ) {
    return this.usersService.updateEmailTwoFactor(req.user.id, dto, req);
  }
}
