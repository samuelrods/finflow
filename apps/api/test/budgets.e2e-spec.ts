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

describe('BudgetsController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;
  let categoryId: string;

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
        email: 'testbudgets@example.com',
        password: 'password123',
      });

    assertIsTokenResponse(res.body);
    accessToken = res.body.accessToken;

    const user = await prisma.user.findUnique({
      where: { email: 'testbudgets@example.com' },
    });
    if (user) userId = user.id;

    // Start with a clean category
    const cat = await prisma.category.create({
      data: {
        name: 'Dining',
        userId,
      },
    });
    categoryId = cat.id;
  });

  it('/budgets (POST) - create budget', async () => {
    const response = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/budgets`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        amount: 350.0,
        month: 5,
        year: 2026,
        categoryId,
      })
      .expect(201);

    const body = response.body as {
      amount: string;
      month: number;
      year: number;
      categoryId: string;
    };
    expect(body).toHaveProperty('amount');
    expect(Number(body.amount)).toBe(350.0);
    expect(body).toHaveProperty('month', 5);
    expect(body).toHaveProperty('year', 2026);
    expect(body).toHaveProperty('categoryId', categoryId);
  });

  it('/budgets (POST) - duplicate budgets should throw 409 Conflict', async () => {
    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/budgets`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        amount: 300.0,
        month: 5,
        year: 2026,
        categoryId,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/${API_PREFIX}/budgets`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        amount: 400.0,
        month: 5,
        year: 2026,
        categoryId,
      })
      .expect(409);
  });

  it('/budgets (GET) - list budgets with spent calculated', async () => {
    // Create a budget
    await prisma.budget.create({
      data: {
        amount: 500.0,
        month: 5,
        year: 2026,
        userId,
        categoryId,
      },
    });

    // Create an expense transaction in that same month/category
    await prisma.transaction.create({
      data: {
        amount: 150.0,
        type: 'EXPENSE',
        date: new Date(Date.UTC(2026, 4, 15)), // May 15
        userId,
        categoryId,
      },
    });

    // Create another transaction in a different month
    await prisma.transaction.create({
      data: {
        amount: 200.0,
        type: 'EXPENSE',
        date: new Date(Date.UTC(2026, 5, 15)), // June 15
        userId,
        categoryId,
      },
    });

    // Fetch budgets for May 2026
    const response = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/budgets?month=5&year=2026`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = response.body as { amount: string; spent: number }[];
    expect(body.length).toBe(1);
    expect(Number(body[0].amount)).toBe(500.0);
    expect(body[0].spent).toBe(150.0);
  });

  it('/budgets/:id (PATCH) - update budget limit', async () => {
    const budget = await prisma.budget.create({
      data: {
        amount: 500.0,
        month: 5,
        year: 2026,
        userId,
        categoryId,
      },
    });

    const response = await request(app.getHttpServer())
      .patch(`/${API_PREFIX}/budgets/${budget.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: 650.0 })
      .expect(200);

    const body = response.body as { amount: string };
    expect(Number(body.amount)).toBe(650.0);
  });

  it('/budgets/:id (DELETE) - delete budget limit', async () => {
    const budget = await prisma.budget.create({
      data: {
        amount: 500.0,
        month: 5,
        year: 2026,
        userId,
        categoryId,
      },
    });

    await request(app.getHttpServer())
      .delete(`/${API_PREFIX}/budgets/${budget.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    const check = await prisma.budget.findUnique({
      where: { id: budget.id },
    });
    expect(check).toBeNull();
  });

  describe('Security & IDOR', () => {
    let otherUserToken: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post(`/${API_PREFIX}/auth/register`)
        .send({
          email: 'budgethacker@example.com',
          password: 'password123',
        });
      assertIsTokenResponse(res.body);
      otherUserToken = res.body.accessToken;
    });

    it("should not allow editing another user's budget", async () => {
      const budget = await prisma.budget.create({
        data: {
          amount: 500.0,
          month: 5,
          year: 2026,
          userId,
          categoryId,
        },
      });

      await request(app.getHttpServer())
        .patch(`/${API_PREFIX}/budgets/${budget.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ amount: 999.0 })
        .expect(404);
    });

    it("should not allow deleting another user's budget", async () => {
      const budget = await prisma.budget.create({
        data: {
          amount: 500.0,
          month: 5,
          year: 2026,
          userId,
          categoryId,
        },
      });

      await request(app.getHttpServer())
        .delete(`/${API_PREFIX}/budgets/${budget.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(404);
    });
  });
});
