import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users.service';
import { UsersRepository } from '../users.repository';
import { UserResponseDto } from '../dto/user-response.dto';

jest.mock('bcrypt');
const bcryptMock = bcrypt as jest.Mocked<typeof bcrypt>;

// ─── Fixtures ────────────────────────────────────────────────────────────────

const USER_ID = 'user-uuid-1234';
const OTHER_USER_ID = 'other-uuid-5678';
const USER_EMAIL = 'test@example.com';
const OTHER_EMAIL = 'other@example.com';
const HASHED_PASSWORD = '$2b$12$hashedpassword';
const NEW_HASHED_PASSWORD = '$2b$12$newhashedpassword';

const mockUser = {
  id: USER_ID,
  email: USER_EMAIL,
  passwordHash: HASHED_PASSWORD,
  refreshTokenHash: '$2b$12$hashedrefreshtoken',
};

// ─── Mock factory ─────────────────────────────────────────────────────────────

const mockUsersRepository = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue(12),
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: mockUsersRepository },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── getMe ─────────────────────────────────────────────────────────────────

  describe('getMe', () => {
    it('returns a UserResponseDto for a valid user', async () => {
      mockUsersRepository.findById.mockResolvedValue(mockUser);

      const result = await service.getMe(USER_ID);

      expect(result).toBeInstanceOf(UserResponseDto);
      expect(result).toEqual({ id: USER_ID, email: USER_EMAIL });
    });

    it('never includes passwordHash or refreshTokenHash in the response', async () => {
      mockUsersRepository.findById.mockResolvedValue(mockUser);

      const result = await service.getMe(USER_ID);

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('refreshTokenHash');
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockUsersRepository.findById.mockResolvedValue(null);

      await expect(service.getMe(USER_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── updateMe ──────────────────────────────────────────────────────────────

  describe('updateMe', () => {
    it('updates the email and returns a UserResponseDto', async () => {
      const updatedUser = { ...mockUser, email: OTHER_EMAIL };
      mockUsersRepository.findByEmail.mockResolvedValue(null);
      mockUsersRepository.update.mockResolvedValue(updatedUser);

      const result = await service.updateMe(USER_ID, { email: OTHER_EMAIL });

      expect(result).toEqual({ id: USER_ID, email: OTHER_EMAIL });
      expect(mockUsersRepository.update).toHaveBeenCalledWith(USER_ID, {
        email: OTHER_EMAIL,
      });
    });

    it('allows a user to "update" to their own current email', async () => {
      // findByEmail returns the same user — this must be allowed, not rejected
      mockUsersRepository.findByEmail.mockResolvedValue(mockUser);
      mockUsersRepository.update.mockResolvedValue(mockUser);

      await expect(
        service.updateMe(USER_ID, { email: USER_EMAIL }),
      ).resolves.not.toThrow();
    });

    it('throws ConflictException when the email belongs to a different user', async () => {
      const otherUser = { ...mockUser, id: OTHER_USER_ID, email: OTHER_EMAIL };
      mockUsersRepository.findByEmail.mockResolvedValue(otherUser);

      await expect(
        service.updateMe(USER_ID, { email: OTHER_EMAIL }),
      ).rejects.toThrow(ConflictException);

      expect(mockUsersRepository.update).not.toHaveBeenCalled();
    });

    it('skips the email uniqueness check when no email is provided in the dto', async () => {
      mockUsersRepository.update.mockResolvedValue(mockUser);

      await service.updateMe(USER_ID, {});

      expect(mockUsersRepository.findByEmail).not.toHaveBeenCalled();
    });
  });

  // ─── changePassword ────────────────────────────────────────────────────────

  describe('changePassword', () => {
    it('hashes the new password and updates it successfully', async () => {
      mockUsersRepository.findById.mockResolvedValue(mockUser);
      bcryptMock.compare.mockResolvedValue(true as never);
      bcryptMock.hash.mockResolvedValue(NEW_HASHED_PASSWORD as never);

      await service.changePassword(USER_ID, {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      });

      expect(mockUsersRepository.update).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({ passwordHash: NEW_HASHED_PASSWORD }),
      );
    });

    it('invalidates the refresh token when password changes (forces re-login on all devices)', async () => {
      mockUsersRepository.findById.mockResolvedValue(mockUser);
      bcryptMock.compare.mockResolvedValue(true as never);
      bcryptMock.hash.mockResolvedValue(NEW_HASHED_PASSWORD as never);

      await service.changePassword(USER_ID, {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      });

      expect(mockUsersRepository.update).toHaveBeenCalledWith(
        USER_ID,
        expect.objectContaining({ refreshTokenHash: null }),
      );
    });

    it('throws UnauthorizedException when the current password is wrong', async () => {
      mockUsersRepository.findById.mockResolvedValue(mockUser);
      bcryptMock.compare.mockResolvedValue(false as never);

      await expect(
        service.changePassword(USER_ID, {
          currentPassword: 'wrong-password',
          newPassword: 'new-password',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockUsersRepository.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockUsersRepository.findById.mockResolvedValue(null);

      await expect(
        service.changePassword(USER_ID, {
          currentPassword: 'old-password',
          newPassword: 'new-password',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── deleteMe ──────────────────────────────────────────────────────────────

  describe('deleteMe', () => {
    it('deletes the user when they exist', async () => {
      mockUsersRepository.findById.mockResolvedValue(mockUser);

      await service.deleteMe(USER_ID);

      expect(mockUsersRepository.delete).toHaveBeenCalledWith(USER_ID);
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockUsersRepository.findById.mockResolvedValue(null);

      await expect(service.deleteMe(USER_ID)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockUsersRepository.delete).not.toHaveBeenCalled();
    });
  });
});
