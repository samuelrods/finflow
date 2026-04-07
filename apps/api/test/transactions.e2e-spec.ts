import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import cookieParser from 'cookie-parser';
import { API_PREFIX } from '../src/common/constants';
import { TransactionType } from '../src/modules/transactions/enums/transaction-type.enum';

function assertIsTokenResponse(
  body: unknown,
): asserts body is { accessToken: string } {
  if (typeof body !== 'object' || body === null || !('accessToken' in body)) {
    throw new Error('Invalid response body');
  }
}

describe('TransactionsController (e2e)', () => {
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
        email: 'testtransactions@example.com',
        password: 'password123',
      });

    assertIsTokenResponse(res.body);
    accessToken = res.body.accessToken;

    const user = await prisma.user.findUnique({
      where: { email: 'testtransactions@example.com' },
    });
    if (user) userId = user.id;

    // Create a category to be used in transactions
    const category = await prisma.category.create({
      data: {
        name: 'Test Category',
        userId,
      },
    });
    categoryId = category.id;
  });

  it('/transactions (POST) - create transaction', async () => {
    const payload = {
      amount: 150.5,
      description: 'Test expense',
      date: new Date().toISOString(),
      type: TransactionType.EXPENSE,
      categoryId,
    };

    const response = await request(app.getHttpServer())
      .post(`/${API_PREFIX}/transactions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send(payload)
      .expect(201);

    expect(response.body).toHaveProperty('amount', '150.5');
    expect(response.body).toHaveProperty('description', 'Test expense');
    expect(response.body).toHaveProperty('id');
  });

  it('/transactions (GET) - list transactions', async () => {
    await prisma.transaction.create({
      data: {
        amount: 100,
        date: new Date(),
        type: TransactionType.INCOME,
        categoryId,
        userId,
      },
    });

    const response = await request(app.getHttpServer())
      .get(`/${API_PREFIX}/transactions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('data');
    const body: unknown = response.body;
    if (typeof body === 'object' && body !== null && 'data' in body) {
      const data = (body as { data: unknown }).data;
      if (Array.isArray(data)) {
        expect(data.length).toBe(1);
        expect(data[0]).toHaveProperty('amount', '100');
      } else {
        throw new Error('Expected data to be an array');
      }
    }
  });

  it('/transactions/:id (PATCH) - update transaction', async () => {
    const transaction = await prisma.transaction.create({
      data: {
        amount: 200,
        date: new Date(),
        type: TransactionType.EXPENSE,
        categoryId,
        userId,
      },
    });

    const response = await request(app.getHttpServer())
      .patch(`/${API_PREFIX}/transactions/${transaction.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ amount: 250 })
      .expect(200);

    expect(response.body).toHaveProperty('amount', '250');
  });

  it('/transactions/:id (DELETE) - remove transaction', async () => {
    const transaction = await prisma.transaction.create({
      data: {
        amount: 300,
        date: new Date(),
        type: TransactionType.EXPENSE,
        categoryId,
        userId,
      },
    });

    await request(app.getHttpServer())
      .delete(`/${API_PREFIX}/transactions/${transaction.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    const check = await prisma.transaction.findUnique({
      where: { id: transaction.id },
    });
    expect(check).toBeNull();
  });

  describe('Security & IDOR', () => {
    let otherUserToken: string;
    let otherUserId: string;
    let otherUserCategoryId: string;

    beforeEach(async () => {
      // Create a second user
      const res = await request(app.getHttpServer())
        .post(`/${API_PREFIX}/auth/register`)
        .send({
          email: 'hacker_tx@example.com',
          password: 'password123',
        });
      assertIsTokenResponse(res.body);
      otherUserToken = res.body.accessToken;

      const user = await prisma.user.findUnique({
        where: { email: 'hacker_tx@example.com' },
      });
      if (user) {
        otherUserId = user.id;
        const cat = await prisma.category.create({
          data: { name: 'Hacker Category', userId: otherUserId },
        });
        otherUserCategoryId = cat.id;
      }
    });

    it("should not allow reading another user's transaction", async () => {
      // Create transaction for user 1
      await prisma.transaction.create({
        data: {
          amount: 500,
          date: new Date(),
          type: TransactionType.INCOME,
          categoryId,
          userId,
        },
      });

      // GET /transactions isn't by ID, it's a list. We can test if the hacker sees it.
      const response = await request(app.getHttpServer())
        .get(`/${API_PREFIX}/transactions`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(200);

      const body: unknown = response.body;
      if (typeof body === 'object' && body !== null && 'data' in body) {
        const data = (body as { data: unknown }).data;
        if (Array.isArray(data)) {
          expect(data.length).toBe(0); // Hacker should see 0 transactions
        }
      }
    });

    it("should not allow updating another user's transaction", async () => {
      const transaction = await prisma.transaction.create({
        data: {
          amount: 500,
          date: new Date(),
          type: TransactionType.INCOME,
          categoryId,
          userId,
        },
      });

      await request(app.getHttpServer())
        .patch(`/${API_PREFIX}/transactions/${transaction.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ amount: 9999 })
        .expect(404);
    });

    it("should not allow deleting another user's transaction", async () => {
      const transaction = await prisma.transaction.create({
        data: {
          amount: 500,
          date: new Date(),
          type: TransactionType.INCOME,
          categoryId,
          userId,
        },
      });

      await request(app.getHttpServer())
        .delete(`/${API_PREFIX}/transactions/${transaction.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(404);
    });

    it("should not allow assigning a transaction to another user's category", async () => {
      // User 1 tries to use User 2's category
      await request(app.getHttpServer())
        .post(`/${API_PREFIX}/transactions`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 50,
          description: 'Sneaky expense',
          date: new Date().toISOString(),
          type: TransactionType.EXPENSE,
          categoryId: otherUserCategoryId,
        })
        .expect(400); // 400 BadRequestException because the API correctly rejects invalid category assignments
    });
  });
});
