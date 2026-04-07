export interface Category {
  id: string;
  name: string;
  icon: string | null;
  userId: string | null;
}

export type TransactionType = "INCOME" | "EXPENSE";

export interface Transaction {
  id: string;
  amount: string; // Decimal serialized as string from Prisma, e.g. "25.50"
  description: string | null;
  date: string; // ISO date string e.g. "2024-01-15T00:00:00.000Z"
  type: TransactionType;
  categoryId: string;
  category: Category;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionListResponse {
  data: Transaction[];
  total: number;
  pages: number;
  incomeTotal: number;
  expenseTotal: number;
  categoryTotals: { categoryId: string; total: number }[];
}

export interface TransactionFilters {
  month?: string; // YYYY-MM
  categoryId?: string;
  type?: TransactionType;
  page?: number;
}
