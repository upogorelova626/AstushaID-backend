import { Module } from '@nestjs/common';

import { UserActivityModule } from '../user-activity/user-activity.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserSessionsModule } from '../user-sessions/user-sessions.module';

@Module({
  imports: [UserActivityModule, UserSessionsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
