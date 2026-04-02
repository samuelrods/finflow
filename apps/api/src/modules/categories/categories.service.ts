import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from '../../generated/prisma/browser';

const DEFAULT_CATEGORIES = [
  { name: 'Food & Dining', icon: '🍽️' },
  { name: 'Transport', icon: '🚗' },
  { name: 'Housing', icon: '🏠' },
  { name: 'Entertainment', icon: '🎬' },
  { name: 'Healthcare', icon: '🏥' },
  { name: 'Shopping', icon: '🛍️' },
  { name: 'Education', icon: '📚' },
  { name: 'Utilities', icon: '⚡' },
  { name: 'Salary', icon: '💼' },
  { name: 'Freelance', icon: '💻' },
  { name: 'Investments', icon: '📈' },
  { name: 'Other', icon: '📦' },
] as const;

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  getAll(userId: string): Promise<Category[]> {
    return this.categoriesRepository.findAllForUser(userId);
  }

  create(userId: string, dto: CreateCategoryDto): Promise<Category> {
    return this.categoriesRepository.create({
      name: dto.name,
      icon: dto.icon ?? null,
      userId,
    });
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.categoriesRepository.findOneForUser(id, userId);

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.categoriesRepository.update(id, {
      name: dto.name,
      icon: dto.icon,
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    const category = await this.categoriesRepository.findOneForUser(id, userId);

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    await this.categoriesRepository.delete(id);
  }

  /**
   * Called once per user at registration time.
   * Populates their category list with sensible defaults so the app
   * is immediately usable without any manual setup.
   */
  async seedDefaultsForUser(userId: string): Promise<void> {
    await this.categoriesRepository.createMany(
      DEFAULT_CATEGORIES.map((c) => ({ ...c, userId })),
    );
  }
}
