import { Module } from '@nestjs/common';

import { UserActivityModule } from '../user-activity/user-activity.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserSessionsModule } from '../user-sessions/user-sessions.module';
import { S3Module } from 'src/s3/s3.module';

@Module({
  imports: [UserActivityModule, UserSessionsModule, S3Module],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
