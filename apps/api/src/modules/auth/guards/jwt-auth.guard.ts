import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Apply to any controller or route that requires a valid access token.
 * Usage: @UseGuards(JwtAuthGuard)
 *
 * On success: populates request.user with JwtPayload ({ sub, email })
 * On failure: returns 401 Unauthorized automatically
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
