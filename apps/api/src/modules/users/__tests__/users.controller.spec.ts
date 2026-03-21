import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';
import { UserResponseDto } from '../dto/user-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const mockJwtUser = { sub: 'user-uuid-1234', email: 'test@example.com' };

const mockUserResponse: UserResponseDto = {
  id: 'user-uuid-1234',
  email: 'test@example.com',
};

// ─── Mock factory ─────────────────────────────────────────────────────────────

const mockUsersService = {
  getMe: jest.fn().mockResolvedValue(mockUserResponse),
  updateMe: jest.fn().mockResolvedValue(mockUserResponse),
  changePassword: jest.fn().mockResolvedValue(undefined),
  deleteMe: jest.fn().mockResolvedValue(undefined),
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    })
      // Replace the real JwtAuthGuard with a passthrough for unit tests.
      // Guard behavior is tested separately (integration/e2e layer).
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── GET /users/me ─────────────────────────────────────────────────────────

  describe('GET /users/me', () => {
    it('returns the user profile', async () => {
      const result = await controller.getMe(mockJwtUser);

      expect(result).toEqual(mockUserResponse);
    });

    it('calls UsersService.getMe with the user id from the JWT payload', async () => {
      await controller.getMe(mockJwtUser);

      expect(mockUsersService.getMe).toHaveBeenCalledWith(mockJwtUser.sub);
    });
  });

  // ─── PATCH /users/me ───────────────────────────────────────────────────────

  describe('PATCH /users/me', () => {
    const dto = { email: 'new@example.com' };

    it('returns the updated user profile', async () => {
      const result = await controller.updateMe(mockJwtUser, dto);

      expect(result).toEqual(mockUserResponse);
    });

    it('calls UsersService.updateMe with the correct user id and dto', async () => {
      await controller.updateMe(mockJwtUser, dto);

      expect(mockUsersService.updateMe).toHaveBeenCalledWith(
        mockJwtUser.sub,
        dto,
      );
    });
  });

  // ─── PATCH /users/me/password ──────────────────────────────────────────────

  describe('PATCH /users/me/password', () => {
    const dto = { currentPassword: 'old-pass', newPassword: 'new-pass-123' };

    it('returns void (204 No Content)', async () => {
      const result = await controller.changePassword(mockJwtUser, dto);

      expect(result).toBeUndefined();
    });

    it('calls UsersService.changePassword with the correct arguments', async () => {
      await controller.changePassword(mockJwtUser, dto);

      expect(mockUsersService.changePassword).toHaveBeenCalledWith(
        mockJwtUser.sub,
        dto,
      );
    });
  });

  // ─── DELETE /users/me ──────────────────────────────────────────────────────

  describe('DELETE /users/me', () => {
    it('returns void (204 No Content)', async () => {
      const result = await controller.deleteMe(mockJwtUser);

      expect(result).toBeUndefined();
    });

    it('calls UsersService.deleteMe with the correct user id', async () => {
      await controller.deleteMe(mockJwtUser);

      expect(mockUsersService.deleteMe).toHaveBeenCalledWith(mockJwtUser.sub);
    });
  });
});
