import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BudgetsRepository, BudgetWithCategory } from './budgets.repository';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { QueryBudgetDto } from './dto/query-budget.dto';
import { Budget } from '../../generated/prisma/browser';

export interface BudgetWithSpent extends BudgetWithCategory {
  spent: number;
}

@Injectable()
export class BudgetsService {
  constructor(private readonly budgetsRepository: BudgetsRepository) {}

  async getAll(
    userId: string,
    query: QueryBudgetDto,
  ): Promise<BudgetWithSpent[]> {
    const now = new Date();
    const month = query.month ?? now.getMonth() + 1;
    const year = query.year ?? now.getFullYear();

    const [budgets, spentMap] = await Promise.all([
      this.budgetsRepository.findAllForUser(userId, { month, year }),
      this.budgetsRepository.getSpentMapForMonth(userId, month, year),
    ]);

    return budgets.map((budget) => ({
      ...budget,
      spent: spentMap.get(budget.categoryId) ?? 0,
    }));
  }

  async getBudgetsForMonths(
    userId: string,
    months: { month: number; year: number }[],
  ): Promise<BudgetWithCategory[]> {
    return this.budgetsRepository.findBudgetsForMonths(userId, months);
  }

  async create(userId: string, dto: CreateBudgetDto): Promise<Budget> {
    const isValidCategory = await this.budgetsRepository.validateCategory(
      dto.categoryId,
      userId,
    );
    if (!isValidCategory) {
      throw new NotFoundException('Category not found or access denied');
    }

    const existing = await this.budgetsRepository.findOneByUnique(
      userId,
      dto.categoryId,
      dto.month,
      dto.year,
    );
    if (existing) {
      throw new ConflictException(
        'A budget for this category, month, and year already exists',
      );
    }

    return this.budgetsRepository.create({
      amount: dto.amount,
      month: dto.month,
      year: dto.year,
      categoryId: dto.categoryId,
      userId,
    });
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateBudgetDto,
  ): Promise<Budget> {
    const budget = await this.budgetsRepository.findOneForUser(id, userId);
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    return this.budgetsRepository.update(id, {
      amount: dto.amount,
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    const budget = await this.budgetsRepository.findOneForUser(id, userId);
    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    await this.budgetsRepository.delete(id);
  }
}
