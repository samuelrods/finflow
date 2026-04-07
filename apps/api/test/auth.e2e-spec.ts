import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import cookieParser from 'cookie-parser';
import { API_PREFIX } from '../src/common/constants';

function assertIsTokenResponse(
  body: unknown,
): asserts body is { accessToken: string } {
  if (typeof body !== 'object' || body === null || !('accessToken' in body)) {
    throw new Error('Invalid response body');
  }
}

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix(API_PREFIX);
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({});
    await app.close();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany({});
  });

  const validUser = {
    email: 'testauth@example.com',
    password: 'password123',
  };

  it('/auth/register (POST) - success', async () => {
    const response = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/register`)
      .send(validUser)
      .expect(201);

    assertIsTokenResponse(response.body);
    expect(response.body.accessToken).toBeDefined();
    expect(response.headers).toHaveProperty('set-cookie');
    const cookies = response.headers['set-cookie'];
    if (Array.isArray(cookies)) {
      expect(cookies[0]).toMatch(/refresh_token/);
    }
  });

  it('/auth/register (POST) - duplicate email', async () => {
    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/register`)
      .send(validUser);

    const response = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/register`)
      .send(validUser)
      .expect(409);

    expect(response.body).toHaveProperty(
      'message',
      expect.stringContaining('already exists'),
    );
  });

  it('/auth/login (POST) - success', async () => {
    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/register`)
      .send(validUser);

    const response = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/login`)
      .send(validUser)
      .expect(200);

    assertIsTokenResponse(response.body);
    expect(response.body.accessToken).toBeDefined();
    const cookies = response.headers['set-cookie'];
    if (Array.isArray(cookies)) {
      expect(cookies[0]).toMatch(/refresh_token/);
    }
  });

  it('/auth/login (POST) - invalid credentials', async () => {
    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/register`)
      .send(validUser);

    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/login`)
      .send({ email: validUser.email, password: 'wrongpassword' })
      .expect(401);
  });

  describe('Security & Guards', () => {
    let accessToken: string;
    let refreshTokenCookie: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post(`/${API_PREFIX}/auth/register`)
        .send(validUser)
        .expect(201);

      assertIsTokenResponse(response.body);
      accessToken = response.body.accessToken;
      const cookies = response.headers['set-cookie'];
      if (Array.isArray(cookies)) {
        refreshTokenCookie = String(cookies[0]);
      } else if (typeof cookies === 'string') {
        refreshTokenCookie = cookies;
      }
    });
    it('should reject requests without Authorization header', async () => {
      await request(app.getHttpServer())
        .post(`/${API_PREFIX}/auth/logout`)
        .expect(401);
    });

    it('should reject requests with invalid Authorization token', async () => {
      await request(app.getHttpServer())
        .post(`/${API_PREFIX}/auth/logout`)
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });

    it('/auth/refresh (POST) - success with valid cookie', async () => {
      const response = await request(app.getHttpServer())
        .post(`/${API_PREFIX}/auth/refresh`)
        .set('Cookie', refreshTokenCookie)
        .expect(200);

      assertIsTokenResponse(response.body);
      expect(response.body.accessToken).toBeDefined();
    });

    it('/auth/refresh (POST) - failure with missing cookie', async () => {
      await request(app.getHttpServer())
        .post(`/${API_PREFIX}/auth/refresh`)
        .expect(401);
    });

    it('/auth/refresh (POST) - failure with invalid cookie', async () => {
      await request(app.getHttpServer())
        .post(`/${API_PREFIX}/auth/refresh`)
        .set('Cookie', 'refresh_token=invalid-token-value')
        .expect(401);
    });

    it('/auth/logout (POST) - success clears cookie', async () => {
      const response = await request(app.getHttpServer())
        .post(`/${API_PREFIX}/auth/logout`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      // check that cookie is cleared (e.g. Max-Age=0 or Expires in past)
      expect(Array.isArray(cookies) ? cookies[0] : cookies).toMatch(
        /refresh_token=;/,
      );
    });
  });
});
