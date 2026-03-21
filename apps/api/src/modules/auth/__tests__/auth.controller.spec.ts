import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ACCESS_TOKEN = 'signed.access.token';
const REFRESH_TOKEN = 'signed.refresh.token';
const TOKEN_PAIR = { accessToken: ACCESS_TOKEN, refreshToken: REFRESH_TOKEN };

const mockUser = { sub: 'user-uuid-1234', email: 'test@example.com' };

// ─── Mock factory ─────────────────────────────────────────────────────────────

const mockAuthService = {
  register: jest.fn().mockResolvedValue(TOKEN_PAIR),
  login: jest.fn().mockResolvedValue(TOKEN_PAIR),
  refresh: jest.fn().mockResolvedValue(TOKEN_PAIR),
  logout: jest.fn().mockResolvedValue(undefined),
};

// The controller calls res.cookie() and res.clearCookie() — mock both.
const mockResponse = {
  cookie: jest.fn(),
  clearCookie: jest.fn(),
} satisfies Pick<Response, 'cookie' | 'clearCookie'>;

const response = mockResponse as unknown as Response;

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── register ──────────────────────────────────────────────────────────────

  describe('POST /auth/register', () => {
    const dto = { email: 'new@example.com', password: 'password123' };

    it('returns only the access token in the response body', async () => {
      const result = await controller.register(dto, response);

      expect(result).toEqual({ accessToken: ACCESS_TOKEN });
      // Refresh token must NOT be in the body — it goes in the cookie only
      expect(result).not.toHaveProperty('refreshToken');
    });

    it('sets the refresh token as an httpOnly cookie', async () => {
      await controller.register(dto, response);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        REFRESH_TOKEN,
        expect.objectContaining({ httpOnly: true }),
      );
    });

    it('scopes the cookie to /auth path only', async () => {
      await controller.register(dto, response);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        REFRESH_TOKEN,
        expect.objectContaining({ path: '/auth' }),
      );
    });

    it('delegates to AuthService.register with the dto', async () => {
      await controller.register(dto, response);

      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
    });
  });

  // ─── login ─────────────────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    const dto = { email: 'test@example.com', password: 'password123' };

    it('returns only the access token in the response body', async () => {
      const result = await controller.login(dto, response);

      expect(result).toEqual({ accessToken: ACCESS_TOKEN });
      expect(result).not.toHaveProperty('refreshToken');
    });

    it('sets an httpOnly cookie scoped to /auth', async () => {
      await controller.login(dto, response);

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        REFRESH_TOKEN,
        expect.objectContaining({ httpOnly: true, path: '/auth' }),
      );
    });
  });

  // ─── refresh ───────────────────────────────────────────────────────────────

  describe('POST /auth/refresh', () => {
    const userWithToken = { ...mockUser, rawToken: REFRESH_TOKEN };

    it('returns a new access token', async () => {
      const result = await controller.refresh(userWithToken, response);

      expect(result).toEqual({ accessToken: ACCESS_TOKEN });
    });

    it('rotates the refresh token cookie', async () => {
      await controller.refresh(userWithToken, response);

      // A new cookie must be set — the old token is now invalid
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        REFRESH_TOKEN,
        expect.objectContaining({ httpOnly: true }),
      );
    });

    it('passes the raw token to the service for DB validation', async () => {
      await controller.refresh(userWithToken, response);

      expect(mockAuthService.refresh).toHaveBeenCalledWith(
        mockUser.sub,
        mockUser.email,
        REFRESH_TOKEN,
      );
    });
  });

  // ─── logout ────────────────────────────────────────────────────────────────

  describe('POST /auth/logout', () => {
    it('calls AuthService.logout with the user id', async () => {
      await controller.logout(mockUser, response);

      expect(mockAuthService.logout).toHaveBeenCalledWith(mockUser.sub);
    });

    it('clears the refresh token cookie on logout', async () => {
      await controller.logout(mockUser, response);

      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        'refresh_token',
        expect.objectContaining({ path: '/auth' }),
      );
    });

    it('does not set a new cookie during logout', async () => {
      await controller.logout(mockUser, response);

      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });
  });
});
