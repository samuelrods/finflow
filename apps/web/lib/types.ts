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

export interface AnalyticsTrend {
  date: string;
  income: number;
  expense: number;
}

export interface AnalyticsCategory {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  total: number;
  percentage: number;
}

export interface AnalyticsHistory {
  month: string;
  income: number;
  expense: number;
  savingsRate: number;
}

export interface AnalyticsInsights {
  savingsRate: {
    current: number;
    change: number;
    status: "good" | "average" | "poor";
  };
  topCategory: {
    name: string;
    total: number;
    percentage: number;
  } | null;
  spendingVelocity: {
    currentMtd: number;
    previousMtd: number;
    percentageChange: number;
    isFaster: boolean;
  };
  largeTransactions: {
    id: string;
    amount: number;
    description: string | null;
    date: string;
    categoryName: string;
  }[];
}

export interface AnalyticsResponse {
  trends: AnalyticsTrend[];
  categories: AnalyticsCategory[];
  history: AnalyticsHistory[];
  insights: AnalyticsInsights;
}
