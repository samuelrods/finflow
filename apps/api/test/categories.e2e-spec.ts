import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
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

describe('CategoriesController (e2e)', () => {
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
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
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
        email: 'testcategories@example.com',
        password: 'password123',
      });

    assertIsTokenResponse(res.body);
    accessToken = res.body.accessToken;

    const user = await prisma.user.findUnique({
      where: { email: 'testcategories@example.com' },
    });
    if (user) userId = user.id;

    // Delete default seeded categories so we start clean for these tests
    await prisma.category.deleteMany({ where: { userId } });
  });

  it('/categories (POST) - create category', async () => {
    const response = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/categories`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Groceries',
        icon: '🛒',
      })
      .expect(201);

    expect(response.body).toHaveProperty('name', 'Groceries');
    expect(response.body).toHaveProperty('icon', '🛒');
    expect(response.body).toHaveProperty('id');
  });

  it('/categories (POST) - invalid data', async () => {
    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/categories`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        icon: '🛒',
        // missing name
      })
      .expect(400);
  });

  it('/categories (GET) - list categories', async () => {
    // Create one category
    await prisma.category.create({
      data: {
        name: 'Salary',
        icon: '💰',
        userId,
      },
    });

    const response = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/categories`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body: unknown = response.body;
    if (!Array.isArray(body)) {
      throw new Error('Expected response to be an array');
    }

    expect(body.length).toBe(1);
    expect(body[0]).toHaveProperty('name', 'Salary');
  });

  it('/categories/:id (PATCH) - update category', async () => {
    const category = await prisma.category.create({
      data: {
        name: 'Food',
        userId,
      },
    });

    const response = await request(app.getHttpServer())
      .patch(`/${API_PREFIX}/categories/${category.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Dining Out' })
      .expect(200);

    expect(response.body).toHaveProperty('name', 'Dining Out');
  });

  it('/categories/:id (DELETE) - remove category', async () => {
    const category = await prisma.category.create({
      data: {
        name: 'Food',
        userId,
      },
    });

    await request(app.getHttpServer())
      .delete(`/${API_PREFIX}/categories/${category.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    const check = await prisma.category.findUnique({
      where: { id: category.id },
    });
    expect(check).toBeNull();
  });

  describe('Security & IDOR', () => {
    let otherUserToken: string;

    beforeEach(async () => {
      // Create a second user and get their token
      const res = await request(app.getHttpServer())
        .post(`/${API_PREFIX}/auth/register`)
        .send({
          email: 'hacker@example.com',
          password: 'password123',
        });
      assertIsTokenResponse(res.body);
      otherUserToken = res.body.accessToken;
    });

    it("should not allow updating another user's category", async () => {
      // Category belongs to userId (the first user)
      const category = await prisma.category.create({
        data: {
          name: 'Target Category',
          userId,
        },
      });

      await request(app.getHttpServer())
        .patch(`/${API_PREFIX}/categories/${category.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ name: 'Hacked Name' })
        .expect(404); // Expect 404 because the service throws NotFoundException for IDOR protection
    });

    it("should not allow deleting another user's category", async () => {
      const category = await prisma.category.create({
        data: {
          name: 'Target Category',
          userId,
        },
      });

      await request(app.getHttpServer())
        .delete(`/${API_PREFIX}/categories/${category.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(404);

      // Verify it still exists
      const check = await prisma.category.findUnique({
        where: { id: category.id },
      });
      expect(check).not.toBeNull();
    });
  });
});
