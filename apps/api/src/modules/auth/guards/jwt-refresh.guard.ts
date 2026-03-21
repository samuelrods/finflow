import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Validates the refresh_token httpOnly cookie.
 * Only applied to POST /auth/refresh — nowhere else.
 */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
