import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

export interface RefreshTokenPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(private readonly configService: ConfigService) {
    super({
      // Refresh token comes from the httpOnly cookie, not the Authorization header
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request): string | null => {
          const token: unknown = req?.cookies?.['refresh_token'];
          return typeof token === 'string' ? token : null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      // Pass the full request so the service can compare the token against
      // the hashed value stored in the database
      passReqToCallback: true,
    });
  }

  validate(
    req: Request,
    payload: RefreshTokenPayload,
  ): RefreshTokenPayload & { rawToken: string } {
    const token: unknown = req?.cookies?.['refresh_token'];
    const rawToken = typeof token === 'string' ? token : undefined;

    if (!rawToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    return { ...payload, rawToken };
  }
}
