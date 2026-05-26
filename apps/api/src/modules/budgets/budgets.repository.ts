import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Budget, Prisma } from '../../generated/prisma/browser';

export type BudgetWithCategory = Prisma.BudgetGetPayload<{
  include: { category: true };
}>;

@Injectable()
export class BudgetsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllForUser(
    userId: string,
    where?: Prisma.BudgetWhereInput,
  ): Promise<BudgetWithCategory[]> {
    return this.prisma.budget.findMany({
      where: { userId, ...where },
      include: { category: true },
      orderBy: { category: { name: 'asc' } },
    });
  }

  findOneForUser(id: string, userId: string): Promise<BudgetWithCategory | null> {
    return this.prisma.budget.findFirst({
      where: { id, userId },
      include: { category: true },
    });
  }

  findOneByUnique(
    userId: string,
    categoryId: string,
    month: number,
    year: number,
  ): Promise<Budget | null> {
    return this.prisma.budget.findUnique({
      where: {
        userId_categoryId_month_year: {
          userId,
          categoryId,
          month,
          year,
        },
      },
    });
  }

  create(data: Prisma.BudgetUncheckedCreateInput): Promise<Budget> {
    return this.prisma.budget.create({ data });
  }

  update(id: string, data: Prisma.BudgetUpdateInput): Promise<Budget> {
    return this.prisma.budget.update({ where: { id }, data });
  }

  delete(id: string): Promise<Budget> {
    return this.prisma.budget.delete({ where: { id } });
  }

  /**
   * Validate that category exists and belongs to the user.
   */
  async validateCategory(id: string, userId: string): Promise<boolean> {
    const count = await this.prisma.category.count({
      where: {
        id,
        userId,
      },
    });
    return count > 0;
  }

  /**
   * Get total spent (EXPENSE transactions) for all categories for a given user, month, and year.
   * Returns a Map where key is categoryId and value is total spent.
   */
  async getSpentMapForMonth(
    userId: string,
    month: number,
    year: number,
  ): Promise<Map<string, number>> {
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 1));

    const aggregate = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: 'EXPENSE',
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const spentMap = new Map<string, number>();
    for (const row of aggregate) {
      spentMap.set(row.categoryId, Number(row._sum.amount ?? 0));
    }
    return spentMap;
  }
}
