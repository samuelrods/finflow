import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from '../categories.controller';
import { CategoriesService } from '../categories.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { NotFoundException } from '@nestjs/common';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockJwtUser = { sub: 'user-uuid-1234', email: 'test@example.com' };

const CATEGORY_ID = 'cat-uuid-5678';

const mockCategory = {
  id: CATEGORY_ID,
  name: 'Food & Dining',
  icon: '🍽️',
  userId: mockJwtUser.sub,
};

// ─── Mock factory ─────────────────────────────────────────────────────────────

const mockCategoriesService = {
  getAll: jest.fn().mockResolvedValue([mockCategory]),
  create: jest.fn().mockResolvedValue(mockCategory),
  update: jest.fn().mockResolvedValue(mockCategory),
  delete: jest.fn().mockResolvedValue(undefined),
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('CategoriesController', () => {
  let controller: CategoriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        { provide: CategoriesService, useValue: mockCategoriesService },
      ],
    })
      // Replace the real JwtAuthGuard with a passthrough for unit tests.
      // Guard behavior is tested separately (integration/e2e layer).
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CategoriesController>(CategoriesController);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── GET /categories ──────────────────────────────────────────────────────

  describe('GET /categories', () => {
    it('returns all categories for the current user', async () => {
      const result = await controller.getAll(mockJwtUser);

      expect(result).toEqual([mockCategory]);
    });

    it('calls CategoriesService.getAll with the user id from the JWT payload', async () => {
      await controller.getAll(mockJwtUser);

      expect(mockCategoriesService.getAll).toHaveBeenCalledWith(
        mockJwtUser.sub,
      );
    });

    it('returns an empty array when the user has no categories', async () => {
      mockCategoriesService.getAll.mockResolvedValueOnce([]);

      const result = await controller.getAll(mockJwtUser);

      expect(result).toEqual([]);
    });
  });

  // ─── POST /categories ─────────────────────────────────────────────────────

  describe('POST /categories', () => {
    const createDto = { name: 'Food & Dining', icon: '🍽️' };

    it('returns the newly created category', async () => {
      const result = await controller.create(mockJwtUser, createDto);

      expect(result).toEqual(mockCategory);
    });

    it('calls CategoriesService.create with the correct user id and dto', async () => {
      await controller.create(mockJwtUser, createDto);

      expect(mockCategoriesService.create).toHaveBeenCalledWith(
        mockJwtUser.sub,
        createDto,
      );
    });

    it('creates a category without an icon when icon is omitted', async () => {
      const dtoWithoutIcon = { name: 'Misc' };
      const noIconCategory = { ...mockCategory, icon: null };
      mockCategoriesService.create.mockResolvedValueOnce(noIconCategory);

      const result = await controller.create(mockJwtUser, dtoWithoutIcon);

      expect(mockCategoriesService.create).toHaveBeenCalledWith(
        mockJwtUser.sub,
        dtoWithoutIcon,
      );
      expect(result).toEqual(noIconCategory);
    });
  });

  // ─── PATCH /categories/:id ────────────────────────────────────────────────

  describe('PATCH /categories/:id', () => {
    const updateDto = { name: 'Groceries', icon: '🛒' };

    it('returns the updated category', async () => {
      const updated = { ...mockCategory, ...updateDto };
      mockCategoriesService.update.mockResolvedValueOnce(updated);

      const result = await controller.update(
        CATEGORY_ID,
        mockJwtUser,
        updateDto,
      );

      expect(result).toEqual(updated);
    });

    it('calls CategoriesService.update with the correct id, user id, and dto', async () => {
      await controller.update(CATEGORY_ID, mockJwtUser, updateDto);

      expect(mockCategoriesService.update).toHaveBeenCalledWith(
        CATEGORY_ID,
        mockJwtUser.sub,
        updateDto,
      );
    });

    it('forwards the NotFoundException thrown by the service when category is not found', async () => {
      mockCategoriesService.update.mockRejectedValueOnce(
        new NotFoundException('Category not found'),
      );

      await expect(
        controller.update(CATEGORY_ID, mockJwtUser, updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── DELETE /categories/:id ───────────────────────────────────────────────

  describe('DELETE /categories/:id', () => {
    it('returns void (204 No Content)', async () => {
      const result = await controller.delete(CATEGORY_ID, mockJwtUser);

      expect(result).toBeUndefined();
    });

    it('calls CategoriesService.delete with the correct id and user id', async () => {
      await controller.delete(CATEGORY_ID, mockJwtUser);

      expect(mockCategoriesService.delete).toHaveBeenCalledWith(
        CATEGORY_ID,
        mockJwtUser.sub,
      );
    });

    it('forwards the NotFoundException thrown by the service when category is not found', async () => {
      mockCategoriesService.delete.mockRejectedValueOnce(
        new NotFoundException('Category not found'),
      );

      await expect(controller.delete(CATEGORY_ID, mockJwtUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
