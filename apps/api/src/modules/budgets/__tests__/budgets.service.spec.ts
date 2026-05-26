import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { BudgetsService } from '../budgets.service';
import { BudgetsRepository } from '../budgets.repository';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const USER_ID = 'user-uuid-1234';
const BUDGET_ID = 'budget-uuid-5678';
const CATEGORY_ID = 'cat-uuid-9999';

const mockBudget = {
  id: BUDGET_ID,
  amount: 500.0,
  month: 5,
  year: 2026,
  userId: USER_ID,
  categoryId: CATEGORY_ID,
  category: {
    id: CATEGORY_ID,
    name: 'Food',
    icon: '🍔',
    userId: USER_ID,
  },
};

// ─── Mock Repository ─────────────────────────────────────────────────────────

const mockBudgetsRepository = {
  findAllForUser: jest.fn(),
  findOneForUser: jest.fn(),
  findOneByUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  validateCategory: jest.fn(),
  getSpentMapForMonth: jest.fn(),
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('BudgetsService', () => {
  let service: BudgetsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetsService,
        { provide: BudgetsRepository, useValue: mockBudgetsRepository },
      ],
    }).compile();

    service = module.get<BudgetsService>(BudgetsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── getAll ───────────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns budgets with spent amount mapped correctly', async () => {
      const query = { month: 5, year: 2026 };
      mockBudgetsRepository.findAllForUser.mockResolvedValue([mockBudget]);

      const spentMap = new Map<string, number>();
      spentMap.set(CATEGORY_ID, 120.5);
      mockBudgetsRepository.getSpentMapForMonth.mockResolvedValue(spentMap);

      const result = await service.getAll(USER_ID, query);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: BUDGET_ID,
        amount: 500.0,
        spent: 120.5,
      });
      expect(mockBudgetsRepository.findAllForUser).toHaveBeenCalledWith(
        USER_ID,
        { month: 5, year: 2026 },
      );
      expect(mockBudgetsRepository.getSpentMapForMonth).toHaveBeenCalledWith(
        USER_ID,
        5,
        2026,
      );
    });

    it('returns 0 spent if category is not in the spent map', async () => {
      const query = { month: 5, year: 2026 };
      mockBudgetsRepository.findAllForUser.mockResolvedValue([mockBudget]);
      mockBudgetsRepository.getSpentMapForMonth.mockResolvedValue(new Map());

      const result = await service.getAll(USER_ID, query);

      expect(result[0].spent).toBe(0);
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = {
      amount: 500.0,
      month: 5,
      year: 2026,
      categoryId: CATEGORY_ID,
    };

    it('creates a budget if category is valid and no budget exists', async () => {
      mockBudgetsRepository.validateCategory.mockResolvedValue(true);
      mockBudgetsRepository.findOneByUnique.mockResolvedValue(null);
      mockBudgetsRepository.create.mockResolvedValue(mockBudget);

      const result = await service.create(USER_ID, dto);

      expect(mockBudgetsRepository.validateCategory).toHaveBeenCalledWith(
        CATEGORY_ID,
        USER_ID,
      );
      expect(mockBudgetsRepository.findOneByUnique).toHaveBeenCalledWith(
        USER_ID,
        CATEGORY_ID,
        5,
        2026,
      );
      expect(mockBudgetsRepository.create).toHaveBeenCalledWith({
        amount: 500.0,
        month: 5,
        year: 2026,
        categoryId: CATEGORY_ID,
        userId: USER_ID,
      });
      expect(result).toEqual(mockBudget);
    });

    it('throws NotFoundException if category is invalid/not owned', async () => {
      mockBudgetsRepository.validateCategory.mockResolvedValue(false);

      await expect(service.create(USER_ID, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockBudgetsRepository.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException if budget already exists for this category/month/year', async () => {
      mockBudgetsRepository.validateCategory.mockResolvedValue(true);
      mockBudgetsRepository.findOneByUnique.mockResolvedValue(mockBudget);

      await expect(service.create(USER_ID, dto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockBudgetsRepository.create).not.toHaveBeenCalled();
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    const dto = { amount: 600.0 };

    it('updates the budget if it belongs to the user', async () => {
      mockBudgetsRepository.findOneForUser.mockResolvedValue(mockBudget);
      mockBudgetsRepository.update.mockResolvedValue({
        ...mockBudget,
        amount: 600.0,
      });

      const result = await service.update(BUDGET_ID, USER_ID, dto);

      expect(mockBudgetsRepository.findOneForUser).toHaveBeenCalledWith(
        BUDGET_ID,
        USER_ID,
      );
      expect(mockBudgetsRepository.update).toHaveBeenCalledWith(BUDGET_ID, {
        amount: 600.0,
      });
      expect(result.amount).toBe(600.0);
    });

    it('throws NotFoundException if budget does not exist for the user', async () => {
      mockBudgetsRepository.findOneForUser.mockResolvedValue(null);

      await expect(service.update(BUDGET_ID, USER_ID, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockBudgetsRepository.update).not.toHaveBeenCalled();
    });
  });

  // ─── delete ───────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes the budget if it belongs to the user', async () => {
      mockBudgetsRepository.findOneForUser.mockResolvedValue(mockBudget);
      mockBudgetsRepository.delete.mockResolvedValue(mockBudget);

      await service.delete(BUDGET_ID, USER_ID);

      expect(mockBudgetsRepository.findOneForUser).toHaveBeenCalledWith(
        BUDGET_ID,
        USER_ID,
      );
      expect(mockBudgetsRepository.delete).toHaveBeenCalledWith(BUDGET_ID);
    });

    it('throws NotFoundException if budget does not exist for the user', async () => {
      mockBudgetsRepository.findOneForUser.mockResolvedValue(null);

      await expect(service.delete(BUDGET_ID, USER_ID)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockBudgetsRepository.delete).not.toHaveBeenCalled();
    });
  });
});
