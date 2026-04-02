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
  ): Promise<TransactionWithCategory[]> {
    return this.prisma.transaction.findMany({
      where: { userId, ...where },
      include: { category: true },
      orderBy: { date: 'desc' },
    });
  }

  countForUser(
    userId: string,
    where?: Prisma.TransactionWhereInput,
  ): Promise<number> {
    return this.prisma.transaction.count({ where: { userId, ...where } });
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
