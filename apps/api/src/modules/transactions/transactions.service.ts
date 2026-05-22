import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  TransactionsRepository,
  TransactionWithCategory,
} from './transactions.repository';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';
import { QueryAnalyticsDto } from './dto/query-analytics.dto';
import { Prisma } from '../../generated/prisma/browser';
import { CategoriesService } from '../categories/categories.service';

export interface TransactionListResult {
  data: TransactionWithCategory[];
  total: number;
  pages: number;
  incomeTotal: number;
  expenseTotal: number;
  categoryTotals: { categoryId: string; total: number }[];
}

@Injectable()
export class TransactionsService {
  constructor(
    private readonly transactionsRepository: TransactionsRepository,
    private readonly categoriesService: CategoriesService,
  ) {}

  async getAll(
    userId: string,
    query: QueryTransactionDto,
  ): Promise<TransactionListResult> {
    const where = this.buildWhereClause(query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total, { incomeTotal, expenseTotal }, categoryTotals] =
      await Promise.all([
        this.transactionsRepository.findAllForUser(userId, where, {
          skip,
          take: limit,
        }),
        this.transactionsRepository.countForUser(userId, where),
        this.transactionsRepository.aggregateByType(userId, where),
        this.transactionsRepository.aggregateByCategory(userId, where),
      ]);

    console.log('getAll where:', where);
    console.log('categoryTotals:', categoryTotals);

    return {
      data,
      total,
      pages: Math.ceil(total / limit),
      incomeTotal,
      expenseTotal,
      categoryTotals,
    };
  }

  async getOne(id: string, userId: string): Promise<TransactionWithCategory> {
    const transaction = await this.transactionsRepository.findOneForUser(
      id,
      userId,
    );

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  private async validateCategoryOwnership(categoryId: string, userId: string) {
    try {
      // getOne or similar could be exposed, but we can reuse the update check, or we can just fetch all categories for now.
      // Actually CategoriesService has no getOne method, so let's get all and find.
      const categories = await this.categoriesService.getAll(userId);
      const category = categories.find((c) => c.id === categoryId);
      if (!category) {
        throw new BadRequestException('Invalid category');
      }
    } catch {
      throw new BadRequestException('Invalid category');
    }
  }

  async create(
    userId: string,
    dto: CreateTransactionDto,
  ): Promise<TransactionWithCategory> {
    await this.validateCategoryOwnership(dto.categoryId, userId);

    const transaction = await this.transactionsRepository.create({
      amount: dto.amount,
      description: dto.description,
      date: dto.date,
      type: dto.type,
      userId,
      categoryId: dto.categoryId,
    });

    return this.transactionsRepository.findOneForUser(
      transaction.id,
      userId,
    ) as Promise<TransactionWithCategory>;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateTransactionDto,
  ): Promise<TransactionWithCategory> {
    await this.getOne(id, userId);

    if (dto.categoryId) {
      await this.validateCategoryOwnership(dto.categoryId, userId);
    }

    await this.transactionsRepository.update(id, {
      amount: dto.amount,
      description: dto.description,
      date: dto.date,
      type: dto.type,
      categoryId: dto.categoryId,
    });

    return this.transactionsRepository.findOneForUser(
      id,
      userId,
    ) as Promise<TransactionWithCategory>;
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.getOne(id, userId);
    await this.transactionsRepository.delete(id);
  }

  /**
   * Retrieves aggregated transaction analytics including trends, categories, and monthly insights.
   * @example
   * const analytics = await service.getAnalytics('user-123', { month: '2026-05' });
   */
  async getAnalytics(userId: string, query: QueryAnalyticsDto) {
    const monthStr = query.month ?? this.getCurrentMonthString();
    const [year, m] = monthStr.split('-').map(Number);
    const targetStart = new Date(Date.UTC(year, m - 1, 1));
    const targetEnd = new Date(Date.UTC(year, m, 1));
    const prevStart = new Date(Date.UTC(year, m - 2, 1));
    const prevEnd = new Date(Date.UTC(year, m - 1, 1));
    const historyStart = new Date(Date.UTC(year, m - 6, 1));
    const txs = await this.transactionsRepository.findAllForUser(userId, {
      date: { gte: historyStart, lt: targetEnd },
    });
    const targetTx = txs.filter(
      (t) => t.date >= targetStart && t.date < targetEnd,
    );
    const prevTx = txs.filter((t) => t.date >= prevStart && t.date < prevEnd);
    return {
      trends: this.calculateDailyTrends(targetStart, targetEnd, targetTx),
      categories: this.calculateCategoryBreakdown(targetTx),
      history: this.calculateMonthlyHistory(historyStart, targetEnd, txs),
      insights: this.calculateInsights(targetTx, prevTx, monthStr),
    };
  }

  private getCurrentMonthString(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private initializeDaysMap(start: Date, end: Date) {
    const daysMap = new Map<string, { income: number; expense: number }>();
    const curr = new Date(start);
    while (curr < end) {
      daysMap.set(curr.toISOString().split('T')[0], { income: 0, expense: 0 });
      curr.setUTCDate(curr.getUTCDate() + 1);
    }
    return daysMap;
  }

  private calculateDailyTrends(
    start: Date,
    end: Date,
    txs: TransactionWithCategory[],
  ) {
    const daysMap = this.initializeDaysMap(start, end);
    for (const tx of txs) {
      const key = new Date(tx.date).toISOString().split('T')[0];
      const day = daysMap.get(key);
      if (!day) {
        continue;
      }
      const amt = Number(tx.amount);
      if (tx.type === 'INCOME') {
        day.income += amt;
      } else {
        day.expense += amt;
      }
    }
    return Array.from(daysMap.entries()).map(([date, vals]) => ({
      date,
      income: Number(vals.income.toFixed(2)),
      expense: Number(vals.expense.toFixed(2)),
    }));
  }

  private calculateCategoryBreakdown(txs: TransactionWithCategory[]) {
    const expenses = txs.filter((t) => t.type === 'EXPENSE');
    const total = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
    const catMap = new Map<
      string,
      { name: string; icon: string | null; total: number }
    >();
    for (const tx of expenses) {
      const existing = catMap.get(tx.categoryId) ?? {
        name: tx.category.name,
        icon: tx.category.icon,
        total: 0,
      };
      existing.total += Number(tx.amount);
      catMap.set(tx.categoryId, existing);
    }
    return Array.from(catMap.entries())
      .map(([id, info]) => ({
        categoryId: id,
        categoryName: info.name,
        categoryIcon: info.icon,
        total: Number(info.total.toFixed(2)),
        percentage:
          total > 0 ? Number(((info.total / total) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }

  private initializeMonthsMap(start: Date, end: Date) {
    const monthsMap = new Map<string, { income: number; expense: number }>();
    const curr = new Date(start);
    while (curr < end) {
      const key = `${curr.getUTCFullYear()}-${String(curr.getUTCMonth() + 1).padStart(2, '0')}`;
      monthsMap.set(key, { income: 0, expense: 0 });
      curr.setUTCMonth(curr.getUTCMonth() + 1);
    }
    return monthsMap;
  }

  private calculateMonthlyHistory(
    start: Date,
    end: Date,
    txs: TransactionWithCategory[],
  ) {
    const monthsMap = this.initializeMonthsMap(start, end);
    for (const tx of txs) {
      const date = new Date(tx.date);
      const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      const val = monthsMap.get(key);
      if (!val) {
        continue;
      }
      const amt = Number(tx.amount);
      if (tx.type === 'INCOME') {
        val.income += amt;
      } else {
        val.expense += amt;
      }
    }
    return Array.from(monthsMap.entries()).map(([month, vals]) => ({
      month,
      income: Number(vals.income.toFixed(2)),
      expense: Number(vals.expense.toFixed(2)),
      savingsRate:
        vals.income > 0
          ? Number(
              (((vals.income - vals.expense) / vals.income) * 100).toFixed(1),
            )
          : 0,
    }));
  }

  private sumByType(
    txs: TransactionWithCategory[],
    type: 'INCOME' | 'EXPENSE',
  ): number {
    return txs
      .filter((t) => t.type === type)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }

  private calculateSavingsRate(txs: TransactionWithCategory[]): number {
    const income = this.sumByType(txs, 'INCOME');
    const expense = this.sumByType(txs, 'EXPENSE');
    return income > 0 ? ((income - expense) / income) * 100 : 0;
  }

  private sumMtdExpenses(
    txs: TransactionWithCategory[],
    endDay: number,
  ): number {
    return txs
      .filter(
        (t) => t.type === 'EXPENSE' && new Date(t.date).getUTCDate() <= endDay,
      )
      .reduce((sum, t) => sum + Number(t.amount), 0);
  }

  private getTopCategoryInsight(txs: TransactionWithCategory[]) {
    const breakdown = this.calculateCategoryBreakdown(txs);
    return breakdown.length > 0
      ? {
          name: breakdown[0].categoryName,
          total: breakdown[0].total,
          percentage: breakdown[0].percentage,
        }
      : null;
  }

  private getLargeTransactions(txs: TransactionWithCategory[]) {
    return txs
      .filter((t) => t.type === 'EXPENSE' && Number(t.amount) >= 100)
      .map((t) => ({
        id: t.id,
        amount: Number(t.amount),
        description: t.description,
        date: new Date(t.date).toISOString().split('T')[0],
        categoryName: t.category.name,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }

  private calculateInsights(
    targetTx: TransactionWithCategory[],
    prevTx: TransactionWithCategory[],
    monthStr: string,
  ) {
    const currentRate = this.calculateSavingsRate(targetTx);
    const prevRate = this.calculateSavingsRate(prevTx);
    const status =
      currentRate >= 20
        ? ('good' as const)
        : currentRate >= 5
          ? ('average' as const)
          : ('poor' as const);
    const isCurrentMonth = monthStr === this.getCurrentMonthString();
    const endDay = isCurrentMonth ? new Date().getUTCDate() : 31;
    const currentMtd = this.sumMtdExpenses(targetTx, endDay);
    const previousMtd = this.sumMtdExpenses(prevTx, endDay);
    const percentageChange =
      previousMtd > 0
        ? Number((((currentMtd - previousMtd) / previousMtd) * 100).toFixed(1))
        : 0;
    return {
      savingsRate: {
        current: Number(currentRate.toFixed(1)),
        change: Number((currentRate - prevRate).toFixed(1)),
        status,
      },
      topCategory: this.getTopCategoryInsight(targetTx),
      spendingVelocity: {
        currentMtd: Number(currentMtd.toFixed(2)),
        previousMtd: Number(previousMtd.toFixed(2)),
        percentageChange,
        isFaster: currentMtd > previousMtd,
      },
      largeTransactions: this.getLargeTransactions(targetTx),
    };
  }

  private buildWhereClause(
    query: QueryTransactionDto,
  ): Prisma.TransactionWhereInput {
    const where: Prisma.TransactionWhereInput = {};

    if (query.month) {
      const [year, month] = query.month.split('-').map(Number);
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 1));
      where.date = { gte: startDate, lt: endDate };
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.type) {
      where.type = query.type;
    }

    return where;
  }
}
