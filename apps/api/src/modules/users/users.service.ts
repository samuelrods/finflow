import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UserResponseDto } from './dto/user-response.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../../config/env.validation';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  async getMe(userId: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return new UserResponseDto(user);
  }

  async updateMe(userId: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    if (dto.email) {
      const existingUser = await this.usersRepository.findByEmail(dto.email);

      // Allow if it's their own email, reject if it belongs to someone else
      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Email already in use');
      }
    }

    const updatedUser = await this.usersRepository.update(userId, {
      email: dto.email,
    });

    return new UserResponseDto(updatedUser);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const bcryptRounds = this.configService.get('BCRYPT_ROUNDS', {
      infer: true,
    });

    const newPasswordHash = await bcrypt.hash(dto.newPassword, bcryptRounds);

    await this.usersRepository.update(userId, {
      passwordHash: newPasswordHash,
      // Invalidate all refresh tokens on password change, forces the user to re-login on all devices
      refreshTokenHash: null,
    });
  }

  async deleteMe(userId: string): Promise<void> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.usersRepository.delete(userId);
  }
}
