"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  Plus,
} from "lucide-react";
import { useTransactions } from "@/hooks/use-transactions";
import { useCategories } from "@/hooks/use-categories";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Pie, PieChart, Cell } from "recharts";
import { TransactionList } from "@/components/transactions/transaction-list";
import { TransactionForm } from "@/components/transactions/transaction-form";

const CHART_COLORS = [
  "#0ea5e9", // sky-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#f97316", // orange-500
  "#14b8a6", // teal-500
  "#6366f1", // indigo-500
  "#84cc16", // lime-500
];

export default function DashboardPage() {
  const { user } = useAuth();

  // Initialize to current month
  const currentDate = new Date();
  const initialMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;

  const [monthStr, setMonthStr] = useState(initialMonthStr);
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);

  const { data: transactionsData, isLoading: isLoadingTransactions } =
    useTransactions({ month: monthStr });
  const { data: categoriesData, isLoading: isLoadingCategories } =
    useCategories();

  const incomeTotal = transactionsData?.incomeTotal ?? 0;
  const expenseTotal = transactionsData?.expenseTotal ?? 0;
  const netBalance = incomeTotal - expenseTotal;

  const categoryTotals = transactionsData?.categoryTotals;

  const chartData = useMemo(() => {
    if (!categoryTotals || !categoriesData) return [];

    return categoryTotals
      .map((ct) => {
        const category = categoriesData.find((c) => c.id === ct.categoryId);
        return {
          category: category?.name || "Unknown",
          total: ct.total,
        };
      })
      .sort((a, b) => b.total - a.total)
      .map((item, index) => ({
        ...item,
        fill: CHART_COLORS[index % CHART_COLORS.length],
      }));
  }, [categoryTotals, categoriesData]);

  // Dynamically generate chart config to support our dynamic categories
  const chartConfig = useMemo(() => {
    const config: Record<string, { label: string; color?: string }> = {
      total: { label: "Total Spent" },
    };
    chartData.forEach((item) => {
      config[item.category] = {
        label: item.category,
        color: item.fill,
      };
    });
    return config;
  }, [chartData]);

  const navigateMonth = (direction: -1 | 1) => {
    const [year, m] = monthStr.split("-").map(Number);
    const date = new Date(year, m - 1 + direction, 1);
    setMonthStr(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    );
  };

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}!
            Here&apos;s an overview of your finances.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateMonth(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="month"
            value={monthStr}
            onChange={(e) => setMonthStr(e.target.value)}
            className="w-auto font-medium"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateMonth(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              ${incomeTotal.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Expenses
            </CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">
              ${expenseTotal.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${netBalance >= 0 ? "text-emerald-600" : "text-rose-600"}`}
            >
              ${netBalance.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 flex flex-col">
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>
              Your expenses categorized for {monthStr}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center">
            {chartData.length > 0 ? (
              <ChartContainer
                config={chartConfig}
                className="min-h-[300px] w-full"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent />}
                  />
                  <Pie
                    data={chartData}
                    dataKey="total"
                    nameKey="category"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground border border-dashed rounded-md">
                {isLoadingTransactions || isLoadingCategories
                  ? "Loading..."
                  : "No expenses this month."}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your transactions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full justify-start"
              onClick={() => setIsAddTransactionOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Quick Add Transaction
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/dashboard/transactions">
                <ArrowRight className="mr-2 h-4 w-4" />
                View All Transactions
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/dashboard/categories">
                <ArrowRight className="mr-2 h-4 w-4" />
                Manage Categories
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Your most recent activity for {monthStr}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionList
            transactions={transactionsData?.data?.slice(0, 5) || []}
            isLoading={isLoadingTransactions}
          />
        </CardContent>
      </Card>

      <TransactionForm
        open={isAddTransactionOpen}
        onOpenChange={setIsAddTransactionOpen}
      />
    </main>
  );
}
