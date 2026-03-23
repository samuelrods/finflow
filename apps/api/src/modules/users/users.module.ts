import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { UsersController } from './users.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  controllers: [UsersController],
  imports: [DatabaseModule],
  providers: [UsersService, UsersRepository],
  // Export UsersRepository and UsersService so the auth module can use them
  // (e.g., to validate credentials during login, to store refresh tokens)
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
