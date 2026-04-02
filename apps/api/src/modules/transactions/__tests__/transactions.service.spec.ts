import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TransactionsService } from '../transactions.service';
import { TransactionsRepository } from '../transactions.repository';
import { TransactionType } from '../enums/transaction-type.enum';
import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { UpdateTransactionDto } from '../dto/update-transaction.dto';
import { QueryTransactionDto } from '../dto/query-transaction.dto';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const USER_ID = 'user-uuid-1234';
const TRANSACTION_ID = 'txn-uuid-5678';
const CATEGORY_ID = 'cat-uuid-9012';

const mockCategory = {
  id: CATEGORY_ID,
  name: 'Food & Dining',
  icon: '🍽️',
  userId: USER_ID,
};

const mockTransaction = {
  id: TRANSACTION_ID,
  amount: 50.0,
  description: 'Lunch',
  date: new Date('2024-03-15T00:00:00.000Z'),
  type: TransactionType.EXPENSE,
  userId: USER_ID,
  categoryId: CATEGORY_ID,
  category: mockCategory,
};

// ─── Mock factory ─────────────────────────────────────────────────────────────

const mockTransactionsRepository = {
  findAllForUser: jest.fn(),
  countForUser: jest.fn(),
  findOneForUser: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('TransactionsService', () => {
  let service: TransactionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: TransactionsRepository,
          useValue: mockTransactionsRepository,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── getAll ───────────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns a data array and total count for the given user', async () => {
      mockTransactionsRepository.findAllForUser.mockResolvedValue([
        mockTransaction,
      ]);
      mockTransactionsRepository.countForUser.mockResolvedValue(1);

      const result = await service.getAll(USER_ID, {});

      expect(result).toEqual({ data: [mockTransaction], total: 1 });
    });

    it('calls findAllForUser and countForUser with the user id', async () => {
      mockTransactionsRepository.findAllForUser.mockResolvedValue([]);
      mockTransactionsRepository.countForUser.mockResolvedValue(0);

      await service.getAll(USER_ID, {});

      expect(mockTransactionsRepository.findAllForUser).toHaveBeenCalledWith(
        USER_ID,
        {},
      );
      expect(mockTransactionsRepository.countForUser).toHaveBeenCalledWith(
        USER_ID,
        {},
      );
    });

    it('returns empty data and zero total when the user has no transactions', async () => {
      mockTransactionsRepository.findAllForUser.mockResolvedValue([]);
      mockTransactionsRepository.countForUser.mockResolvedValue(0);

      const result = await service.getAll(USER_ID, {});

      expect(result).toEqual({ data: [], total: 0 });
    });

    it('runs findAllForUser and countForUser in parallel', async () => {
      const order: string[] = [];
      mockTransactionsRepository.findAllForUser.mockImplementation(() => {
        order.push('find');
        return Promise.resolve([mockTransaction]);
      });
      mockTransactionsRepository.countForUser.mockImplementation(() => {
        order.push('count');
        return Promise.resolve(1);
      });

      await service.getAll(USER_ID, {});

      // Both must have been called (order is non-deterministic in Promise.all)
      expect(order).toContain('find');
      expect(order).toContain('count');
    });

    // ── where-clause filtering ───────────────────────────────────────────────

    it('passes a date range where-clause when month query param is provided', async () => {
      mockTransactionsRepository.findAllForUser.mockResolvedValue([]);
      mockTransactionsRepository.countForUser.mockResolvedValue(0);
      const query: QueryTransactionDto = { month: '2024-03' };

      await service.getAll(USER_ID, query);

      const expectedWhere = {
        date: {
          gte: new Date(Date.UTC(2024, 2, 1)),
          lt: new Date(Date.UTC(2024, 3, 1)),
        },
      };
      expect(mockTransactionsRepository.findAllForUser).toHaveBeenCalledWith(
        USER_ID,
        expectedWhere,
      );
      expect(mockTransactionsRepository.countForUser).toHaveBeenCalledWith(
        USER_ID,
        expectedWhere,
      );
    });

    it('passes a categoryId where-clause when categoryId query param is provided', async () => {
      mockTransactionsRepository.findAllForUser.mockResolvedValue([]);
      mockTransactionsRepository.countForUser.mockResolvedValue(0);
      const query: QueryTransactionDto = { categoryId: CATEGORY_ID };

      await service.getAll(USER_ID, query);

      const expectedWhere = { categoryId: CATEGORY_ID };
      expect(mockTransactionsRepository.findAllForUser).toHaveBeenCalledWith(
        USER_ID,
        expectedWhere,
      );
    });

    it('passes a type where-clause when type query param is provided', async () => {
      mockTransactionsRepository.findAllForUser.mockResolvedValue([]);
      mockTransactionsRepository.countForUser.mockResolvedValue(0);
      const query: QueryTransactionDto = { type: TransactionType.INCOME };

      await service.getAll(USER_ID, query);

      const expectedWhere = { type: TransactionType.INCOME };
      expect(mockTransactionsRepository.findAllForUser).toHaveBeenCalledWith(
        USER_ID,
        expectedWhere,
      );
    });

    it('combines all query filters into a single where-clause', async () => {
      mockTransactionsRepository.findAllForUser.mockResolvedValue([]);
      mockTransactionsRepository.countForUser.mockResolvedValue(0);
      const query: QueryTransactionDto = {
        month: '2024-03',
        categoryId: CATEGORY_ID,
        type: TransactionType.EXPENSE,
      };

      await service.getAll(USER_ID, query);

      const expectedWhere = {
        date: {
          gte: new Date(Date.UTC(2024, 2, 1)),
          lt: new Date(Date.UTC(2024, 3, 1)),
        },
        categoryId: CATEGORY_ID,
        type: TransactionType.EXPENSE,
      };
      expect(mockTransactionsRepository.findAllForUser).toHaveBeenCalledWith(
        USER_ID,
        expectedWhere,
      );
    });

    it('builds the correct date range for January (month boundary edge case)', async () => {
      mockTransactionsRepository.findAllForUser.mockResolvedValue([]);
      mockTransactionsRepository.countForUser.mockResolvedValue(0);

      await service.getAll(USER_ID, { month: '2024-01' });

      const expectedWhere = {
        date: {
          gte: new Date(Date.UTC(2024, 0, 1)),
          lt: new Date(Date.UTC(2024, 1, 1)),
        },
      };
      expect(mockTransactionsRepository.findAllForUser).toHaveBeenCalledWith(
        USER_ID,
        expectedWhere,
      );
    });

    it('builds the correct date range for December (month boundary edge case)', async () => {
      mockTransactionsRepository.findAllForUser.mockResolvedValue([]);
      mockTransactionsRepository.countForUser.mockResolvedValue(0);

      await service.getAll(USER_ID, { month: '2024-12' });

      const expectedWhere = {
        date: {
          gte: new Date(Date.UTC(2024, 11, 1)),
          lt: new Date(Date.UTC(2025, 0, 1)),
        },
      };
      expect(mockTransactionsRepository.findAllForUser).toHaveBeenCalledWith(
        USER_ID,
        expectedWhere,
      );
    });
  });

  // ─── getOne ───────────────────────────────────────────────────────────────

  describe('getOne', () => {
    it('returns the transaction when it belongs to the user', async () => {
      mockTransactionsRepository.findOneForUser.mockResolvedValue(
        mockTransaction,
      );

      const result = await service.getOne(TRANSACTION_ID, USER_ID);

      expect(result).toEqual(mockTransaction);
    });

    it('calls findOneForUser with the correct id and userId', async () => {
      mockTransactionsRepository.findOneForUser.mockResolvedValue(
        mockTransaction,
      );

      await service.getOne(TRANSACTION_ID, USER_ID);

      expect(mockTransactionsRepository.findOneForUser).toHaveBeenCalledWith(
        TRANSACTION_ID,
        USER_ID,
      );
    });

    it('throws NotFoundException when the transaction does not exist', async () => {
      mockTransactionsRepository.findOneForUser.mockResolvedValue(null);

      await expect(service.getOne(TRANSACTION_ID, USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when the transaction belongs to another user', async () => {
      mockTransactionsRepository.findOneForUser.mockResolvedValue(null);

      await expect(
        service.getOne(TRANSACTION_ID, 'other-user-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException with the message "Transaction not found"', async () => {
      mockTransactionsRepository.findOneForUser.mockResolvedValue(null);

      await expect(service.getOne(TRANSACTION_ID, USER_ID)).rejects.toThrow(
        'Transaction not found',
      );
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    const createDto: CreateTransactionDto = {
      amount: 50.0,
      description: 'Lunch',
      date: new Date('2024-03-15'),
      type: TransactionType.EXPENSE,
      categoryId: CATEGORY_ID,
    };

    it('returns the transaction with category included', async () => {
      mockTransactionsRepository.create.mockResolvedValue({
        id: TRANSACTION_ID,
      });
      mockTransactionsRepository.findOneForUser.mockResolvedValue(
        mockTransaction,
      );

      const result = await service.create(USER_ID, createDto);

      expect(result).toEqual(mockTransaction);
    });

    it('calls repository.create with the correct payload including userId', async () => {
      mockTransactionsRepository.create.mockResolvedValue({
        id: TRANSACTION_ID,
      });
      mockTransactionsRepository.findOneForUser.mockResolvedValue(
        mockTransaction,
      );

      await service.create(USER_ID, createDto);

      expect(mockTransactionsRepository.create).toHaveBeenCalledWith({
        amount: createDto.amount,
        description: createDto.description,
        date: createDto.date,
        type: createDto.type,
        userId: USER_ID,
        categoryId: createDto.categoryId,
      });
    });

    it('fetches the created transaction with its category after creation', async () => {
      mockTransactionsRepository.create.mockResolvedValue({
        id: TRANSACTION_ID,
      });
      mockTransactionsRepository.findOneForUser.mockResolvedValue(
        mockTransaction,
      );

      await service.create(USER_ID, createDto);

      expect(mockTransactionsRepository.findOneForUser).toHaveBeenCalledWith(
        TRANSACTION_ID,
        USER_ID,
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
        amount: 2000,
      };
      mockTransactionsRepository.create.mockResolvedValue({
        id: TRANSACTION_ID,
      });
      mockTransactionsRepository.findOneForUser.mockResolvedValue(
        incomeTransaction,
      );

      const result = await service.create(USER_ID, incomeDto);

      expect(result.type).toBe(TransactionType.INCOME);
    });

    it('creates a transaction without an optional description', async () => {
      const dtoWithoutDesc: CreateTransactionDto = {
        amount: 10,
        date: new Date('2024-03-15'),
        type: TransactionType.EXPENSE,
        categoryId: CATEGORY_ID,
      };
      mockTransactionsRepository.create.mockResolvedValue({
        id: TRANSACTION_ID,
      });
      mockTransactionsRepository.findOneForUser.mockResolvedValue(
        mockTransaction,
      );

      await service.create(USER_ID, dtoWithoutDesc);

      expect(mockTransactionsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ description: undefined }),
      );
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    const updateDto: UpdateTransactionDto = {
      amount: 75.0,
      description: 'Dinner',
    };

    it('returns the updated transaction with category included', async () => {
      const updatedTransaction = {
        ...mockTransaction,
        amount: 75.0,
        description: 'Dinner',
      };
      mockTransactionsRepository.findOneForUser
        .mockResolvedValueOnce(mockTransaction) // ownership check inside getOne
        .mockResolvedValueOnce(updatedTransaction); // final fetch
      mockTransactionsRepository.update.mockResolvedValue(undefined);

      const result = await service.update(TRANSACTION_ID, USER_ID, updateDto);

      expect(result).toEqual(updatedTransaction);
    });

    it('calls repository.update with the correct id and fields', async () => {
      mockTransactionsRepository.findOneForUser
        .mockResolvedValueOnce(mockTransaction)
        .mockResolvedValueOnce(mockTransaction);
      mockTransactionsRepository.update.mockResolvedValue(undefined);

      await service.update(TRANSACTION_ID, USER_ID, updateDto);

      expect(mockTransactionsRepository.update).toHaveBeenCalledWith(
        TRANSACTION_ID,
        {
          amount: updateDto.amount,
          description: updateDto.description,
          date: undefined,
          type: undefined,
          categoryId: undefined,
        },
      );
    });

    it('fetches the updated transaction with its category after updating', async () => {
      mockTransactionsRepository.findOneForUser
        .mockResolvedValueOnce(mockTransaction)
        .mockResolvedValueOnce(mockTransaction);
      mockTransactionsRepository.update.mockResolvedValue(undefined);

      await service.update(TRANSACTION_ID, USER_ID, updateDto);

      expect(
        mockTransactionsRepository.findOneForUser,
      ).toHaveBeenLastCalledWith(TRANSACTION_ID, USER_ID);
    });

    it('throws NotFoundException without calling repository.update when transaction is not found', async () => {
      mockTransactionsRepository.findOneForUser.mockResolvedValue(null);

      await expect(
        service.update(TRANSACTION_ID, USER_ID, updateDto),
      ).rejects.toThrow(NotFoundException);

      expect(mockTransactionsRepository.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the transaction belongs to another user', async () => {
      mockTransactionsRepository.findOneForUser.mockResolvedValue(null);

      await expect(
        service.update(TRANSACTION_ID, 'other-user-id', updateDto),
      ).rejects.toThrow(NotFoundException);

      expect(mockTransactionsRepository.update).not.toHaveBeenCalled();
    });
  });

  // ─── delete ───────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('resolves without a value on successful deletion', async () => {
      mockTransactionsRepository.findOneForUser.mockResolvedValue(
        mockTransaction,
      );
      mockTransactionsRepository.delete.mockResolvedValue(undefined);

      const result = await service.delete(TRANSACTION_ID, USER_ID);

      expect(result).toBeUndefined();
    });

    it('calls repository.delete with the correct transaction id', async () => {
      mockTransactionsRepository.findOneForUser.mockResolvedValue(
        mockTransaction,
      );
      mockTransactionsRepository.delete.mockResolvedValue(undefined);

      await service.delete(TRANSACTION_ID, USER_ID);

      expect(mockTransactionsRepository.delete).toHaveBeenCalledWith(
        TRANSACTION_ID,
      );
    });

    it('throws NotFoundException without calling repository.delete when transaction is not found', async () => {
      mockTransactionsRepository.findOneForUser.mockResolvedValue(null);

      await expect(service.delete(TRANSACTION_ID, USER_ID)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockTransactionsRepository.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the transaction belongs to another user', async () => {
      mockTransactionsRepository.findOneForUser.mockResolvedValue(null);

      await expect(
        service.delete(TRANSACTION_ID, 'other-user-id'),
      ).rejects.toThrow(NotFoundException);

      expect(mockTransactionsRepository.delete).not.toHaveBeenCalled();
    });
  });
});
