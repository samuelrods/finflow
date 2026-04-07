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
    } catch (error) {
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
