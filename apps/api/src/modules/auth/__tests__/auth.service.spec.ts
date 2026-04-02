import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth.service';
import { UsersRepository } from '../../users/users.repository';
import { CategoriesService } from '../../categories/categories.service';

// Mock bcrypt at module level — real hashing takes ~100ms per call at 12 rounds.
// Without this, a suite of 15 tests would take ~30 seconds. With mocks: <1s.
jest.mock('bcrypt');
const bcryptMock = bcrypt as jest.Mocked<typeof bcrypt>;

// ─── Shared test fixtures ────────────────────────────────────────────────────

const USER_ID = 'user-uuid-1234';
const USER_EMAIL = 'test@example.com';
const RAW_PASSWORD = 'password123';
const HASHED_PASSWORD = '$2b$12$hashedpassword';
const RAW_REFRESH_TOKEN = 'raw.refresh.token';
const HASHED_REFRESH_TOKEN = '$2b$12$hashedrefreshtoken';
const ACCESS_TOKEN = 'signed.access.token';
const REFRESH_TOKEN = 'signed.refresh.token';

const mockUser = {
  id: USER_ID,
  email: USER_EMAIL,
  passwordHash: HASHED_PASSWORD,
  refreshTokenHash: HASHED_REFRESH_TOKEN,
};

// ─── Mock factories ───────────────────────────────────────────────────────────

const mockUsersRepository = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockImplementation((key: string) => {
    if (key === 'BCRYPT_ROUNDS') return 12;
    return undefined;
  }),
  getOrThrow: jest.fn().mockReturnValue('test-secret'),
};

const mockCategoriesService = {
  // Mock the fire-and-forget seeding method so it doesn't crash the test
  seedDefaultsForUser: jest.fn().mockResolvedValue(undefined),
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CategoriesService, useValue: mockCategoriesService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Default happy-path mock returns for token issuance
    mockJwtService.signAsync
      .mockResolvedValueOnce(ACCESS_TOKEN)
      .mockResolvedValueOnce(REFRESH_TOKEN);

    bcryptMock.hash.mockResolvedValue(HASHED_REFRESH_TOKEN as never);
    mockUsersRepository.update.mockResolvedValue(mockUser);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── register ──────────────────────────────────────────────────────────────

  describe('register', () => {
    it('creates a new user and returns a token pair', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(null);
      bcryptMock.hash
        .mockResolvedValueOnce(HASHED_PASSWORD as never) // password hash
        .mockResolvedValueOnce(HASHED_REFRESH_TOKEN as never); // refresh token hash
      mockUsersRepository.create.mockResolvedValue(mockUser);

      const result = await service.register({
        email: USER_EMAIL,
        password: RAW_PASSWORD,
      });

      expect(result).toEqual({
        accessToken: ACCESS_TOKEN,
        refreshToken: REFRESH_TOKEN,
      });
      expect(mockUsersRepository.create).toHaveBeenCalledWith({
        email: USER_EMAIL,
        passwordHash: HASHED_PASSWORD,
      });
      expect(mockCategoriesService.seedDefaultsForUser).toHaveBeenCalledWith(
        USER_ID,
      );
    });

    it('throws ConflictException when email is already registered', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.register({ email: USER_EMAIL, password: RAW_PASSWORD }),
      ).rejects.toThrow(ConflictException);

      expect(mockUsersRepository.create).not.toHaveBeenCalled();
    });

    it('stores a hash of the refresh token, not the raw token', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(null);
      bcryptMock.hash
        .mockResolvedValueOnce(HASHED_PASSWORD as never)
        .mockResolvedValueOnce(HASHED_REFRESH_TOKEN as never);
      mockUsersRepository.create.mockResolvedValue(mockUser);

      await service.register({ email: USER_EMAIL, password: RAW_PASSWORD });

      // The value stored in the DB must NOT be the raw token
      expect(mockUsersRepository.update).toHaveBeenCalledWith(USER_ID, {
        refreshTokenHash: HASHED_REFRESH_TOKEN,
      });
      expect(mockUsersRepository.update).not.toHaveBeenCalledWith(USER_ID, {
        refreshTokenHash: REFRESH_TOKEN,
      });
    });
  });

  // ─── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('returns a token pair for valid credentials', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(mockUser);
      bcryptMock.compare.mockResolvedValue(true as never);

      const result = await service.login({
        email: USER_EMAIL,
        password: RAW_PASSWORD,
      });

      expect(result).toEqual({
        accessToken: ACCESS_TOKEN,
        refreshToken: REFRESH_TOKEN,
      });
    });

    it('throws UnauthorizedException for wrong password', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(mockUser);
      bcryptMock.compare.mockResolvedValue(false as never);

      await expect(
        service.login({ email: USER_EMAIL, password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when email does not exist', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(null);
      bcryptMock.compare.mockResolvedValue(false as never);

      await expect(
        service.login({ email: 'nobody@example.com', password: RAW_PASSWORD }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('always calls bcrypt.compare even when the user does not exist (timing attack prevention)', async () => {
      // If bcrypt.compare was skipped for missing users, an attacker could
      // enumerate valid emails by measuring response time differences.
      mockUsersRepository.findByEmail.mockResolvedValue(null);
      bcryptMock.compare.mockResolvedValue(false as never);

      await expect(
        service.login({ email: 'nobody@example.com', password: RAW_PASSWORD }),
      ).rejects.toThrow(UnauthorizedException);

      expect(bcryptMock.compare).toHaveBeenCalledTimes(1);
    });

    it('error message does not reveal whether email or password was wrong', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(null);
      bcryptMock.compare.mockResolvedValue(false as never);

      const error = (await service
        .login({ email: 'nobody@example.com', password: RAW_PASSWORD })
        .catch((e: UnauthorizedException) => e)) as UnauthorizedException;

      expect(error.message).toBe('Invalid credentials');
      // Critically: NOT 'Email not found' or 'Wrong password'
    });
  });

  // ─── refresh ───────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('issues a new token pair when the refresh token is valid', async () => {
      mockUsersRepository.findById.mockResolvedValue(mockUser);
      bcryptMock.compare.mockResolvedValue(true as never);
      bcryptMock.hash.mockResolvedValue(HASHED_REFRESH_TOKEN as never);

      const result = await service.refresh(
        USER_ID,
        USER_EMAIL,
        RAW_REFRESH_TOKEN,
      );

      expect(result).toEqual({
        accessToken: ACCESS_TOKEN,
        refreshToken: REFRESH_TOKEN,
      });
    });

    it('throws UnauthorizedException when the user does not exist', async () => {
      mockUsersRepository.findById.mockResolvedValue(null);

      await expect(
        service.refresh(USER_ID, USER_EMAIL, RAW_REFRESH_TOKEN),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when no refresh token is stored (already logged out)', async () => {
      mockUsersRepository.findById.mockResolvedValue({
        ...mockUser,
        refreshTokenHash: null,
      });

      await expect(
        service.refresh(USER_ID, USER_EMAIL, RAW_REFRESH_TOKEN),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('invalidates stored token and throws when token does not match (possible token reuse)', async () => {
      // This is the stolen token scenario: a refresh token was used after logout,
      // or an attacker is attempting to use a stolen old token.
      mockUsersRepository.findById.mockResolvedValue(mockUser);
      bcryptMock.compare.mockResolvedValue(false as never);

      await expect(
        service.refresh(USER_ID, USER_EMAIL, 'tampered.token'),
      ).rejects.toThrow(UnauthorizedException);

      // Must wipe the stored token to kill all sessions
      expect(mockUsersRepository.update).toHaveBeenCalledWith(USER_ID, {
        refreshTokenHash: null,
      });
    });
  });

  // ─── logout ────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('clears the stored refresh token from the database', async () => {
      await service.logout(USER_ID);

      expect(mockUsersRepository.update).toHaveBeenCalledWith(USER_ID, {
        refreshTokenHash: null,
      });
    });
  });
});
