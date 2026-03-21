import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  CurrentUser,
  type JwtPayload,
} from '../../common/decorators/current-user.decorator';
import { UserResponseDto } from './dto/user-response.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users/me
   * Returns the authenticated user's profile.
   */
  @Get('me')
  async getMe(@CurrentUser() user: JwtPayload): Promise<UserResponseDto> {
    return this.usersService.getMe(user.sub);
  }

  /**
   * PATCH /users/me
   * Updates non-sensitive profile fields (currently: email).
   */
  @Patch('me')
  async updateMe(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateMe(user.sub, dto);
  }

  /**
   * PATCH /users/me/password
   * Changes the user's password. Requires current password verification.
   * Invalidates all active refresh tokens, forcing re-login on all devices.
   */
  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.usersService.changePassword(user.sub, dto);
  }

  /**
   * DELETE /users/me
   * Permanently deletes the authenticated user's account and all associated data.
   * Cascading deletes for transactions and categories are handled at the DB level
   * via Prisma schema relations (onDelete: Cascade).
   */
  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMe(@CurrentUser() user: JwtPayload): Promise<void> {
    return this.usersService.deleteMe(user.sub);
  }
}
