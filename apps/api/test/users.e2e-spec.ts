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

describe('UsersController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;

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

    // Register user to get access token
    const res = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/register`)
      .send({
        email: 'testuser@example.com',
        password: 'password123',
      });

    assertIsTokenResponse(res.body);
    accessToken = res.body.accessToken;

    const user = await prisma.user.findUnique({
      where: { email: 'testuser@example.com' },
    });
    if (user) userId = user.id;
  });

  it('/users/me (GET) - get profile', async () => {
    const response = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/users/me`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('email', 'testuser@example.com');
    expect(response.body).toHaveProperty('id', userId);
  });

  it('/users/me (GET) - unauthorized', async () => {
    await request(app.getHttpServer())
      .get(`/${API_PREFIX}/users/me`)
      .expect(401);
  });

  it('/users/me (PATCH) - update profile', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/${API_PREFIX}/users/me`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'newemail@example.com' })
      .expect(200);

    expect(response.body).toHaveProperty('email', 'newemail@example.com');
  });

  it('/users/me/password (PATCH) - change password', async () => {
    await request(app.getHttpServer())
      .patch(`/${API_PREFIX}/users/me/password`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        currentPassword: 'password123',
        newPassword: 'newpassword123',
      })
      .expect(204);

    // Verify login with new password
    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/auth/login`)
      .send({
        email: 'testuser@example.com',
        password: 'newpassword123',
      })
      .expect(200);
  });
});
