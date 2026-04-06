import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma, Transaction } from '../../generated/prisma/browser';

export type TransactionWithCategory = Prisma.TransactionGetPayload<{
  include: { category: true };
}>;

@Injectable()
export class TransactionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllForUser(
    userId: string,
    where?: Prisma.TransactionWhereInput,
    pagination?: { skip?: number; take?: number },
  ): Promise<TransactionWithCategory[]> {
    return this.prisma.transaction.findMany({
      where: { userId, ...where },
      include: { category: true },
      orderBy: { date: 'desc' },
      ...pagination,
    });
  }

  countForUser(
    userId: string,
    where?: Prisma.TransactionWhereInput,
  ): Promise<number> {
    return this.prisma.transaction.count({ where: { userId, ...where } });
  }

  async aggregateByType(
    userId: string,
    where?: Prisma.TransactionWhereInput,
  ): Promise<{ incomeTotal: number; expenseTotal: number }> {
    const rows = await this.prisma.transaction.groupBy({
      by: ['type'],
      where: { userId, ...where },
      _sum: { amount: true },
    });

    const income = rows.find((r) => r.type === 'INCOME')?._sum.amount ?? 0;
    const expense = rows.find((r) => r.type === 'EXPENSE')?._sum.amount ?? 0;

    return {
      incomeTotal: Number(income),
      expenseTotal: Number(expense),
    };
  }

  findOneForUser(
    id: string,
    userId: string,
  ): Promise<TransactionWithCategory | null> {
    return this.prisma.transaction.findFirst({
      where: { id, userId },
      include: { category: true },
    });
  }

  create(data: Prisma.TransactionUncheckedCreateInput): Promise<Transaction> {
    return this.prisma.transaction.create({ data });
  }

  update(
    id: string,
    data: Prisma.TransactionUncheckedUpdateInput,
  ): Promise<Transaction> {
    return this.prisma.transaction.update({ where: { id }, data });
  }

  delete(id: string): Promise<Transaction> {
    return this.prisma.transaction.delete({ where: { id } });
  }
}
