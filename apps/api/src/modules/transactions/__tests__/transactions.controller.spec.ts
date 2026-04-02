import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TransactionsController } from '../transactions.controller';
import { TransactionsService } from '../transactions.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TransactionType } from '../enums/transaction-type.enum';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { UpdateTransactionDto } from '../dto/update-transaction.dto';
import { QueryTransactionDto } from '../dto/query-transaction.dto';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockJwtUser = { sub: 'user-uuid-1234', email: 'test@example.com' };

const TRANSACTION_ID = 'txn-uuid-5678';
const CATEGORY_ID = 'cat-uuid-9012';

const mockTransaction = {
  id: TRANSACTION_ID,
  amount: 50.0,
  description: 'Lunch',
  date: new Date('2024-03-15T00:00:00.000Z'),
  type: TransactionType.EXPENSE,
  userId: mockJwtUser.sub,
  categoryId: CATEGORY_ID,
  category: {
    id: CATEGORY_ID,
    name: 'Food & Dining',
    icon: '🍽️',
    userId: mockJwtUser.sub,
  },
};

// ─── Mock factory ─────────────────────────────────────────────────────────────

const mockTransactionsService = {
  getAll: jest.fn().mockResolvedValue({ data: [mockTransaction], total: 1 }),
  getOne: jest.fn().mockResolvedValue(mockTransaction),
  create: jest.fn().mockResolvedValue(mockTransaction),
  update: jest.fn().mockResolvedValue(mockTransaction),
  delete: jest.fn().mockResolvedValue(undefined),
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('TransactionsController', () => {
  let controller: TransactionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [
        { provide: TransactionsService, useValue: mockTransactionsService },
      ],
    })
      // Replace the real JwtAuthGuard with a passthrough for unit tests.
      // Guard behavior is tested separately (integration/e2e layer).
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TransactionsController>(TransactionsController);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── GET /transactions ────────────────────────────────────────────────────

  describe('GET /transactions', () => {
    it('returns a paginated result with data and total', async () => {
      const result = await controller.getAll(mockJwtUser, {});

      expect(result).toEqual({ data: [mockTransaction], total: 1 });
    });

    it('calls TransactionsService.getAll with the user id from the JWT payload', async () => {
      await controller.getAll(mockJwtUser, {});

      expect(mockTransactionsService.getAll).toHaveBeenCalledWith(
        mockJwtUser.sub,
        {},
      );
    });

    it('forwards the query params to the service', async () => {
      const query: QueryTransactionDto = {
        month: '2024-03',
        categoryId: CATEGORY_ID,
        type: TransactionType.EXPENSE,
      };

      await controller.getAll(mockJwtUser, query);

      expect(mockTransactionsService.getAll).toHaveBeenCalledWith(
        mockJwtUser.sub,
        query,
      );
    });

    it('returns empty data and zero total when the user has no transactions', async () => {
      mockTransactionsService.getAll.mockResolvedValueOnce({
        data: [],
        total: 0,
      });

      const result = await controller.getAll(mockJwtUser, {});

      expect(result).toEqual({ data: [], total: 0 });
    });
  });

  // ─── GET /transactions/:id ────────────────────────────────────────────────

  describe('GET /transactions/:id', () => {
    it('returns the transaction matching the given id', async () => {
      const result = await controller.getOne(TRANSACTION_ID, mockJwtUser);

      expect(result).toEqual(mockTransaction);
    });

    it('calls TransactionsService.getOne with the correct id and user id', async () => {
      await controller.getOne(TRANSACTION_ID, mockJwtUser);

      expect(mockTransactionsService.getOne).toHaveBeenCalledWith(
        TRANSACTION_ID,
        mockJwtUser.sub,
      );
    });

    it('forwards the NotFoundException thrown by the service when transaction is not found', async () => {
      mockTransactionsService.getOne.mockRejectedValueOnce(
        new NotFoundException('Transaction not found'),
      );

      await expect(
        controller.getOne(TRANSACTION_ID, mockJwtUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── POST /transactions ───────────────────────────────────────────────────

  describe('POST /transactions', () => {
    const createDto: CreateTransactionDto = {
      amount: 50.0,
      description: 'Lunch',
      date: new Date('2024-03-15'),
      type: TransactionType.EXPENSE,
      categoryId: CATEGORY_ID,
    };

    it('returns the newly created transaction', async () => {
      const result = await controller.create(mockJwtUser, createDto);

      expect(result).toEqual(mockTransaction);
    });

    it('calls TransactionsService.create with the correct user id and dto', async () => {
      await controller.create(mockJwtUser, createDto);

      expect(mockTransactionsService.create).toHaveBeenCalledWith(
        mockJwtUser.sub,
        createDto,
      );
    });

    it('creates an INCOME transaction correctly', async () => {
      const incomeDto: CreateTransactionDto = {
        amount: 2000,
        date: new Date('2024-03-01'),
        type: TransactionType.INCOME,
        categoryId: CATEGORY_ID,
      };
      const incomeTransaction = {
        ...mockTransaction,
        type: TransactionType.INCOME,
      };
      mockTransactionsService.create.mockResolvedValueOnce(incomeTransaction);

      const result = await controller.create(mockJwtUser, incomeDto);

      expect(mockTransactionsService.create).toHaveBeenCalledWith(
        mockJwtUser.sub,
        incomeDto,
      );
      expect(result.type).toBe(TransactionType.INCOME);
    });

    it('creates a transaction without an optional description', async () => {
      const dtoWithoutDesc: CreateTransactionDto = {
        amount: 10,
        date: new Date('2024-03-15'),
        type: TransactionType.EXPENSE,
        categoryId: CATEGORY_ID,
      };

      await controller.create(mockJwtUser, dtoWithoutDesc);

      expect(mockTransactionsService.create).toHaveBeenCalledWith(
        mockJwtUser.sub,
        dtoWithoutDesc,
      );
    });
  });

  // ─── PATCH /transactions/:id ──────────────────────────────────────────────

  describe('PATCH /transactions/:id', () => {
    const updateDto: UpdateTransactionDto = {
      amount: 75.0,
      description: 'Dinner',
    };

    it('returns the updated transaction', async () => {
      const updated = {
        ...mockTransaction,
        amount: 75.0,
        description: 'Dinner',
      };
      mockTransactionsService.update.mockResolvedValueOnce(updated);

      const result = await controller.update(
        TRANSACTION_ID,
        mockJwtUser,
        updateDto,
      );

      expect(result).toEqual(updated);
    });

    it('calls TransactionsService.update with the correct id, user id, and dto', async () => {
      await controller.update(TRANSACTION_ID, mockJwtUser, updateDto);

      expect(mockTransactionsService.update).toHaveBeenCalledWith(
        TRANSACTION_ID,
        mockJwtUser.sub,
        updateDto,
      );
    });

    it('forwards the NotFoundException thrown by the service when transaction is not found', async () => {
      mockTransactionsService.update.mockRejectedValueOnce(
        new NotFoundException('Transaction not found'),
      );

      await expect(
        controller.update(TRANSACTION_ID, mockJwtUser, updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── DELETE /transactions/:id ─────────────────────────────────────────────

  describe('DELETE /transactions/:id', () => {
    it('returns void (204 No Content)', async () => {
      const result = await controller.delete(TRANSACTION_ID, mockJwtUser);

      expect(result).toBeUndefined();
    });

    it('calls TransactionsService.delete with the correct id and user id', async () => {
      await controller.delete(TRANSACTION_ID, mockJwtUser);

      expect(mockTransactionsService.delete).toHaveBeenCalledWith(
        TRANSACTION_ID,
        mockJwtUser.sub,
      );
    });

    it('forwards the NotFoundException thrown by the service when transaction is not found', async () => {
      mockTransactionsService.delete.mockRejectedValueOnce(
        new NotFoundException('Transaction not found'),
      );

      await expect(
        controller.delete(TRANSACTION_ID, mockJwtUser),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
