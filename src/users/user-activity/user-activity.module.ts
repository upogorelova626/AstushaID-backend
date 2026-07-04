import { Module } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma/prisma.service';
import { UserActivityController } from './user-activity.controller';
import { UserActivityService } from './user-activity.service';

@Module({
  controllers: [UserActivityController],
  providers: [UserActivityService, PrismaService],
  exports: [UserActivityService],
})
export class UserActivityModule {}
