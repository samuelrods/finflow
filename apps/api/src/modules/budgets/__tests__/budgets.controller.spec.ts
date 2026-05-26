import { Test, TestingModule } from '@nestjs/testing';
import { BudgetsController } from '../budgets.controller';
import { BudgetsService } from '../budgets.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { NotFoundException } from '@nestjs/common';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockJwtUser = { sub: 'user-uuid-1234', email: 'test@example.com' };
const BUDGET_ID = 'budget-uuid-5678';
const CATEGORY_ID = 'cat-uuid-9999';

const mockBudget = {
  id: BUDGET_ID,
  amount: 500.0,
  month: 5,
  year: 2026,
  userId: mockJwtUser.sub,
  categoryId: CATEGORY_ID,
  spent: 120.0,
};

// ─── Mock Service ─────────────────────────────────────────────────────────────

const mockBudgetsService = {
  getAll: jest.fn().mockResolvedValue([mockBudget]),
  create: jest.fn().mockResolvedValue(mockBudget),
  update: jest.fn().mockResolvedValue(mockBudget),
  delete: jest.fn().mockResolvedValue(undefined),
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('BudgetsController', () => {
  let controller: BudgetsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BudgetsController],
      providers: [{ provide: BudgetsService, useValue: mockBudgetsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BudgetsController>(BudgetsController);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── GET /budgets ─────────────────────────────────────────────────────────

  describe('GET /budgets', () => {
    it('returns all budgets for the current user matching the query', async () => {
      const query = { month: 5, year: 2026 };
      const result = await controller.getAll(mockJwtUser, query);

      expect(result).toEqual([mockBudget]);
      expect(mockBudgetsService.getAll).toHaveBeenCalledWith(
        mockJwtUser.sub,
        query,
      );
    });
  });

  // ─── POST /budgets ────────────────────────────────────────────────────────

  describe('POST /budgets', () => {
    const createDto = {
      amount: 500.0,
      month: 5,
      year: 2026,
      categoryId: CATEGORY_ID,
    };

    it('returns the newly created budget', async () => {
      const result = await controller.create(mockJwtUser, createDto);

      expect(result).toEqual(mockBudget);
      expect(mockBudgetsService.create).toHaveBeenCalledWith(
        mockJwtUser.sub,
        createDto,
      );
    });
  });

  // ─── PATCH /budgets/:id ───────────────────────────────────────────────────

  describe('PATCH /budgets/:id', () => {
    const updateDto = { amount: 600.0 };

    it('returns the updated budget', async () => {
      const updated = { ...mockBudget, amount: 600.0 };
      mockBudgetsService.update.mockResolvedValueOnce(updated);

      const result = await controller.update(BUDGET_ID, mockJwtUser, updateDto);

      expect(result).toEqual(updated);
      expect(mockBudgetsService.update).toHaveBeenCalledWith(
        BUDGET_ID,
        mockJwtUser.sub,
        updateDto,
      );
    });

    it('forwards exceptions thrown by the service', async () => {
      mockBudgetsService.update.mockRejectedValueOnce(
        new NotFoundException('Budget not found'),
      );

      await expect(
        controller.update(BUDGET_ID, mockJwtUser, updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── DELETE /budgets/:id ──────────────────────────────────────────────────

  describe('DELETE /budgets/:id', () => {
    it('returns void (204 No Content)', async () => {
      const result = await controller.delete(BUDGET_ID, mockJwtUser);

      expect(result).toBeUndefined();
      expect(mockBudgetsService.delete).toHaveBeenCalledWith(
        BUDGET_ID,
        mockJwtUser.sub,
      );
    });
  });
});
