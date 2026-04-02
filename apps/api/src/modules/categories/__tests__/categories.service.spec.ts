import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CategoriesService } from '../categories.service';
import { CategoriesRepository } from '../categories.repository';
import { CreateCategoryDto } from '../dto/create-category.dto';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const USER_ID = 'user-uuid-1234';
const CATEGORY_ID = 'cat-uuid-5678';

const mockCategory = {
  id: CATEGORY_ID,
  name: 'Food & Dining',
  icon: '🍽️',
  userId: USER_ID,
};

// ─── Mock factory ─────────────────────────────────────────────────────────────

const mockCategoriesRepository = {
  findAllForUser: jest.fn(),
  findOneForUser: jest.fn(),
  create: jest.fn(),
  createMany: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: CategoriesRepository, useValue: mockCategoriesRepository },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── getAll ───────────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns all categories for the given user', async () => {
      const categories = [mockCategory];
      mockCategoriesRepository.findAllForUser.mockResolvedValue(categories);

      const result = await service.getAll(USER_ID);

      expect(result).toEqual(categories);
      expect(mockCategoriesRepository.findAllForUser).toHaveBeenCalledWith(
        USER_ID,
      );
    });

    it('returns an empty array when the user has no categories', async () => {
      mockCategoriesRepository.findAllForUser.mockResolvedValue([]);

      const result = await service.getAll(USER_ID);

      expect(result).toEqual([]);
    });
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a category with all provided fields', async () => {
      const dto = { name: 'Transport', icon: '🚗' };
      mockCategoriesRepository.create.mockResolvedValue({
        id: CATEGORY_ID,
        userId: USER_ID,
        ...dto,
      });

      const result = await service.create(USER_ID, dto);

      expect(mockCategoriesRepository.create).toHaveBeenCalledWith({
        name: 'Transport',
        icon: '🚗',
        userId: USER_ID,
      });
      expect(result).toMatchObject({ name: 'Transport', icon: '🚗' });
    });

    it('stores icon as null when no icon is supplied', async () => {
      const dto = { name: 'Misc' };
      mockCategoriesRepository.create.mockResolvedValue({
        id: CATEGORY_ID,
        name: 'Misc',
        icon: null,
        userId: USER_ID,
      });

      await service.create(USER_ID, dto);

      expect(mockCategoriesRepository.create).toHaveBeenCalledWith({
        name: 'Misc',
        icon: null,
        userId: USER_ID,
      });
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    it('returns the updated category when it belongs to the user', async () => {
      const dto = { name: 'Groceries', icon: '🛒' };
      const updated = { ...mockCategory, ...dto };
      mockCategoriesRepository.findOneForUser.mockResolvedValue(mockCategory);
      mockCategoriesRepository.update.mockResolvedValue(updated);

      const result = await service.update(CATEGORY_ID, USER_ID, dto);

      expect(result).toEqual(updated);
    });

    it('calls repository.update with the correct id and fields', async () => {
      const dto = { name: 'Groceries', icon: '🛒' };
      mockCategoriesRepository.findOneForUser.mockResolvedValue(mockCategory);
      mockCategoriesRepository.update.mockResolvedValue({
        ...mockCategory,
        ...dto,
      });

      await service.update(CATEGORY_ID, USER_ID, dto);

      expect(mockCategoriesRepository.update).toHaveBeenCalledWith(
        CATEGORY_ID,
        { name: dto.name, icon: dto.icon },
      );
    });

    it('throws NotFoundException when the category does not exist for the user', async () => {
      mockCategoriesRepository.findOneForUser.mockResolvedValue(null);

      await expect(
        service.update(CATEGORY_ID, USER_ID, { name: 'Ghost' }),
      ).rejects.toThrow(NotFoundException);

      expect(mockCategoriesRepository.update).not.toHaveBeenCalled();
    });

    it('does not call repository.update when category ownership check fails', async () => {
      mockCategoriesRepository.findOneForUser.mockResolvedValue(null);

      await expect(
        service.update(CATEGORY_ID, 'other-user-id', { name: 'Stolen' }),
      ).rejects.toThrow(NotFoundException);

      expect(mockCategoriesRepository.update).not.toHaveBeenCalled();
    });
  });

  // ─── delete ───────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes the category when it belongs to the user', async () => {
      mockCategoriesRepository.findOneForUser.mockResolvedValue(mockCategory);
      mockCategoriesRepository.delete.mockResolvedValue(undefined);

      await service.delete(CATEGORY_ID, USER_ID);

      expect(mockCategoriesRepository.delete).toHaveBeenCalledWith(CATEGORY_ID);
    });

    it('returns void on successful deletion', async () => {
      mockCategoriesRepository.findOneForUser.mockResolvedValue(mockCategory);
      mockCategoriesRepository.delete.mockResolvedValue(undefined);

      const result = await service.delete(CATEGORY_ID, USER_ID);

      expect(result).toBeUndefined();
    });

    it('throws NotFoundException when the category does not exist for the user', async () => {
      mockCategoriesRepository.findOneForUser.mockResolvedValue(null);

      await expect(service.delete(CATEGORY_ID, USER_ID)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockCategoriesRepository.delete).not.toHaveBeenCalled();
    });

    it('does not call repository.delete when ownership check fails', async () => {
      mockCategoriesRepository.findOneForUser.mockResolvedValue(null);

      await expect(
        service.delete(CATEGORY_ID, 'other-user-id'),
      ).rejects.toThrow(NotFoundException);

      expect(mockCategoriesRepository.delete).not.toHaveBeenCalled();
    });
  });

  // ─── seedDefaultsForUser ──────────────────────────────────────────────────

  describe('seedDefaultsForUser', () => {
    it('creates exactly 12 default categories for the user', async () => {
      mockCategoriesRepository.createMany.mockResolvedValue(undefined);

      await service.seedDefaultsForUser(USER_ID);

      const [payload] = mockCategoriesRepository.createMany.mock.calls[0] as [
        CreateCategoryDto[],
      ];
      expect(payload).toHaveLength(12);
    });

    it('attaches the userId to every seeded category', async () => {
      mockCategoriesRepository.createMany.mockResolvedValue(undefined);

      await service.seedDefaultsForUser(USER_ID);

      const [payload] = mockCategoriesRepository.createMany.mock.calls[0] as [
        (CreateCategoryDto & { userId: string })[],
      ];
      expect(
        payload.every((c: { userId: string }) => c.userId === USER_ID),
      ).toBe(true);
    });

    it('seeds the expected category names', async () => {
      mockCategoriesRepository.createMany.mockResolvedValue(undefined);

      await service.seedDefaultsForUser(USER_ID);

      const [payload] = mockCategoriesRepository.createMany.mock.calls[0] as [
        CreateCategoryDto[],
      ];
      const names = payload.map((c: { name: string }) => c.name);

      expect(names).toEqual(
        expect.arrayContaining([
          'Food & Dining',
          'Transport',
          'Housing',
          'Entertainment',
          'Healthcare',
          'Shopping',
          'Education',
          'Utilities',
          'Salary',
          'Freelance',
          'Investments',
          'Other',
        ]),
      );
    });

    it('calls repository.createMany exactly once', async () => {
      mockCategoriesRepository.createMany.mockResolvedValue(undefined);

      await service.seedDefaultsForUser(USER_ID);

      expect(mockCategoriesRepository.createMany).toHaveBeenCalledTimes(1);
    });
  });
});
