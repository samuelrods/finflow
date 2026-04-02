import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Category, Prisma } from '../../generated/prisma/browser';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllForUser(userId: string): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  findOneForUser(id: string, userId: string): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: { id, userId },
    });
  }

  create(data: Prisma.CategoryUncheckedCreateInput): Promise<Category> {
    return this.prisma.category.create({ data });
  }

  /**
   * Bulk-insert categories — used when seeding defaults for a new user.
   * Uses createMany for a single round-trip.
   */
  async createMany(data: Prisma.CategoryCreateManyInput[]): Promise<void> {
    await this.prisma.category.createMany({ data });
  }

  update(id: string, data: Prisma.CategoryUpdateInput): Promise<Category> {
    return this.prisma.category.update({ where: { id }, data });
  }

  delete(id: string): Promise<Category> {
    return this.prisma.category.delete({ where: { id } });
  }
}
