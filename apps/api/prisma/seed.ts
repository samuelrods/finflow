import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // Optional: drop all data before seeding (if the user wants it inside the seed script itself)
  // But running `prisma migrate reset` is generally preferred. We'll do a programmatic wipe just in case.
  console.log('Dropping existing data...');
  await prisma.budget.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);
  const passwordHash = await bcrypt.hash('password123', saltRounds);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      passwordHash,
      categories: {
        create: [
          { name: 'Salary', icon: 'Banknote' },
          { name: 'Food', icon: 'Utensils' },
          { name: 'Transport', icon: 'Car' },
          { name: 'Housing', icon: 'Home' },
          { name: 'Utilities', icon: 'Zap' },
          { name: 'Entertainment', icon: 'PartyPopper' },
          { name: 'Healthcare', icon: 'Hospital' },
          { name: 'Education', icon: 'BookText' },
          { name: 'Shopping', icon: 'ShoppingBag' },
          { name: 'Subscriptions', icon: 'Repeat' },
        ],
      },
    },
    include: {
      categories: true,
    },
  });

  const normalUser = await prisma.user.create({
    data: {
      email: 'user@example.com',
      passwordHash,
      categories: {
        create: [
          { name: 'Wages', icon: 'Banknote' },
          { name: 'Groceries', icon: 'ShoppingCart' },
          { name: 'Transit', icon: 'Bus' },
          { name: 'Rent', icon: 'Building' },
          { name: 'Internet', icon: 'Globe' },
        ],
      },
    },
    include: {
      categories: true,
    },
  });

  console.log(`Created users: ${adminUser.email}, ${normalUser.email}`);

  // Create transactions for Admin
  const adminCategories = adminUser.categories.reduce(
    (acc, cat) => {
      acc[cat.name] = cat.id;
      return acc;
    },
    {} as Record<string, string>,
  );

  const now = new Date();
  const adminTransactions: any[] = [];

  for (let i = 0; i < 90; i++) {
    const date = new Date();
    date.setDate(now.getDate() - i);

    // Salary every 30 days
    if (i % 30 === 0) {
      adminTransactions.push({
        amount: 5500.0,
        description: 'Monthly Salary',
        date: new Date(date),
        type: 'INCOME' as const,
        userId: adminUser.id,
        categoryId: adminCategories['Salary'],
      });
    }

    // Daily coffee/food
    adminTransactions.push({
      amount: parseFloat((Math.random() * 20 + 5).toFixed(2)),
      description: 'Daily Meal / Coffee',
      date: new Date(date),
      type: 'EXPENSE' as const,
      userId: adminUser.id,
      categoryId: adminCategories['Food'],
    });

    // Random shopping every 10 days
    if (i % 10 === 0) {
      adminTransactions.push({
        amount: parseFloat((Math.random() * 150 + 50).toFixed(2)),
        description: 'Online Shopping',
        date: new Date(date),
        type: 'EXPENSE' as const,
        userId: adminUser.id,
        categoryId: adminCategories['Shopping'],
      });
    }

    // Transport every 3 days
    if (i % 3 === 0) {
      adminTransactions.push({
        amount: parseFloat((Math.random() * 30 + 10).toFixed(2)),
        description: 'Uber / Gas',
        date: new Date(date),
        type: 'EXPENSE' as const,
        userId: adminUser.id,
        categoryId: adminCategories['Transport'],
      });
    }

    // Monthly bills
    if (i % 30 === 15) {
      adminTransactions.push({
        amount: 1500.0,
        description: 'Rent',
        date: new Date(date),
        type: 'EXPENSE' as const,
        userId: adminUser.id,
        categoryId: adminCategories['Housing'],
      });
      adminTransactions.push({
        amount: 120.0,
        description: 'Electricity & Water',
        date: new Date(date),
        type: 'EXPENSE' as const,
        userId: adminUser.id,
        categoryId: adminCategories['Utilities'],
      });
      adminTransactions.push({
        amount: 45.0,
        description: 'Streaming Services',
        date: new Date(date),
        type: 'EXPENSE' as const,
        userId: adminUser.id,
        categoryId: adminCategories['Subscriptions'],
      });
    }
  }

  await prisma.transaction.createMany({
    data: adminTransactions,
  });

  // Create transactions for Normal User
  const normalCategories = normalUser.categories.reduce(
    (acc, cat) => {
      acc[cat.name] = cat.id;
      return acc;
    },
    {} as Record<string, string>,
  );

  const normalTransactions: any[] = [];

  for (let i = 0; i < 60; i++) {
    const date = new Date();
    date.setDate(now.getDate() - i);

    if (i % 14 === 0) {
      normalTransactions.push({
        amount: 2000.0,
        description: 'Bi-weekly Wages',
        date: new Date(date),
        type: 'INCOME' as const,
        userId: normalUser.id,
        categoryId: normalCategories['Wages'],
      });
    }

    if (i % 7 === 0) {
      normalTransactions.push({
        amount: parseFloat((Math.random() * 100 + 50).toFixed(2)),
        description: 'Weekly Groceries',
        date: new Date(date),
        type: 'EXPENSE' as const,
        userId: normalUser.id,
        categoryId: normalCategories['Groceries'],
      });
    }

    normalTransactions.push({
      amount: parseFloat((Math.random() * 5 + 2).toFixed(2)),
      description: 'Bus Fare',
      date: new Date(date),
      type: 'EXPENSE' as const,
      userId: normalUser.id,
      categoryId: normalCategories['Transit'],
    });

    if (i % 30 === 5) {
      normalTransactions.push({
        amount: 1200.0,
        description: 'Apartment Rent',
        date: new Date(date),
        type: 'EXPENSE' as const,
        userId: normalUser.id,
        categoryId: normalCategories['Rent'],
      });
      normalTransactions.push({
        amount: 60.0,
        description: 'Internet Bill',
        date: new Date(date),
        type: 'EXPENSE' as const,
        userId: normalUser.id,
        categoryId: normalCategories['Internet'],
      });
    }
  }

  await prisma.transaction.createMany({
    data: normalTransactions,
  });

  console.log(`Created ${adminTransactions.length} transactions for Admin`);
  console.log(`Created ${normalTransactions.length} transactions for User`);

  // Create budgets for Admin for the current month
  console.log('Seeding budgets...');
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  await prisma.budget.createMany({
    data: [
      {
        amount: 500.0,
        month: currentMonth,
        year: currentYear,
        userId: adminUser.id,
        categoryId: adminCategories['Food'],
      },
      {
        amount: 250.0,
        month: currentMonth,
        year: currentYear,
        userId: adminUser.id,
        categoryId: adminCategories['Transport'],
      },
      {
        amount: 1600.0,
        month: currentMonth,
        year: currentYear,
        userId: adminUser.id,
        categoryId: adminCategories['Housing'],
      },
      {
        amount: 150.0,
        month: currentMonth,
        year: currentYear,
        userId: adminUser.id,
        categoryId: adminCategories['Utilities'],
      },
    ],
  });

  // Create budgets for Normal User for the current month
  await prisma.budget.createMany({
    data: [
      {
        amount: 400.0,
        month: currentMonth,
        year: currentYear,
        userId: normalUser.id,
        categoryId: normalCategories['Groceries'],
      },
      {
        amount: 100.0,
        month: currentMonth,
        year: currentYear,
        userId: normalUser.id,
        categoryId: normalCategories['Transit'],
      },
      {
        amount: 1200.0,
        month: currentMonth,
        year: currentYear,
        userId: normalUser.id,
        categoryId: normalCategories['Rent'],
      },
    ],
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
