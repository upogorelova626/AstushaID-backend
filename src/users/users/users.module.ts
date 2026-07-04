import { Module } from '@nestjs/common';

import { UserActivityModule } from '../user-activity/user-activity.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [UserActivityModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
