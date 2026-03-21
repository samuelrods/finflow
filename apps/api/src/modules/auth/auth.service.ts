import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersRepository } from '../users/users.repository';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { EnvironmentVariables } from '../../config/env.validation';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  async register(dto: RegisterDto): Promise<TokenPair> {
    const existingUser = await this.usersRepository.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const bcryptRounds = this.configService.get('BCRYPT_ROUNDS', {
      infer: true,
    });

    const passwordHash = await bcrypt.hash(dto.password, bcryptRounds);

    const user = await this.usersRepository.create({
      email: dto.email,
      passwordHash,
    });

    return this.issueTokenPair({ sub: user.id, email: user.email });
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.usersRepository.findByEmail(dto.email);

    // Compare even if user is null to prevent timing attacks.
    // bcrypt.compare against a dummy hash takes the same time as a real compare,
    // making it impossible to infer whether the email exists from response timing.
    const dummyHash =
      '$2b$12$invalidhashfortimingattackprevention000000000000000000';
    const passwordHash = user?.passwordHash ?? dummyHash;

    const isPasswordValid = await bcrypt.compare(dto.password, passwordHash);

    if (!user || !isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokenPair({ sub: user.id, email: user.email });
  }

  async refresh(
    userId: string,
    email: string,
    rawToken: string,
  ): Promise<TokenPair> {
    const user = await this.usersRepository.findById(userId);

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Access denied');
    }

    const isTokenValid = await bcrypt.compare(rawToken, user.refreshTokenHash);

    if (!isTokenValid) {
      // Token doesn't match what's stored — possible token reuse after logout,
      // or a stolen token. Invalidate everything to be safe.
      await this.usersRepository.update(userId, { refreshTokenHash: null });
      throw new UnauthorizedException('Access denied');
    }

    return this.issueTokenPair({ sub: userId, email });
  }

  async logout(userId: string): Promise<void> {
    // Clear stored refresh token — the httpOnly cookie is cleared by the controller.
    // After this, the old refresh token is permanently invalid.
    await this.usersRepository.update(userId, { refreshTokenHash: null });
  }

  private async issueTokenPair(payload: JwtPayload): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    const bcryptRounds = this.configService.get('BCRYPT_ROUNDS', {
      infer: true,
    });

    const refreshTokenHash = await bcrypt.hash(refreshToken, bcryptRounds);
    await this.usersRepository.update(payload.sub, { refreshTokenHash });

    return {
      accessToken,
      refreshToken,
    };
  }
}
