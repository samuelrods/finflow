"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TransactionDataTable } from "@/components/transactions/transaction-data-table";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { CategoryIcon } from "@/components/ui/category-icon";
import { useTransactions } from "@/hooks/use-transactions";
import { useCategories } from "@/hooks/use-categories";
import { TransactionFilters } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Plus, ArrowUpCircle, ArrowDownCircle, Wallet } from "lucide-react";
import Link from "next/link";

function getMonthLabel(month: string): string {
  if (!month) return "All time";
  const [year, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, m - 1));
}

function addMonths(month: string, delta: number): string {
  const [year, m] = month.split("-").map(Number);
  const d = new Date(year, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function TransactionsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(
    () => searchParams.get("categoryId") ?? "",
  );
  const [month, setMonth] = useState(
    () =>
      searchParams.get("month") ??
      (searchParams.get("categoryId") ? "" : currentMonth()),
  );
  const [type, setType] = useState(() => searchParams.get("type") ?? "");
  const [page, setPage] = useState(() =>
    Number(searchParams.get("page") ?? "1"),
  );
  const [formOpen, setFormOpen] = useState(false);

  const handleMonthChange = (newMonth: string | ((prev: string) => string)) => {
    setMonth(newMonth);
    setPage(1);
  };

  const handleCategoryChange = (v: string) => {
    setCategoryId(v === "all" ? "" : v);
    setPage(1);
  };

  const handleTypeChange = (v: string) => {
    setType(v === "all" ? "" : v);
    setPage(1);
  };

  useEffect(() => {
    const params = new URLSearchParams();
    if (month) params.set("month", month);
    if (categoryId) params.set("categoryId", categoryId);
    if (type) params.set("type", type);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    router.replace(
      qs ? `/dashboard/transactions?${qs}` : "/dashboard/transactions",
    );
  }, [month, categoryId, type, page, router]);

  const filters: TransactionFilters = {
    ...(month && { month }),
    ...(categoryId && { categoryId }),
    ...(type && { type: type as "INCOME" | "EXPENSE" }),
    page,
  };

  const { data, isLoading, error } = useTransactions(filters);
  const { data: categories = [] } = useCategories();

  const transactions = data?.data ?? [];
  const totalIncome = data?.incomeTotal ?? 0;
  const totalExpenses = data?.expenseTotal ?? 0;
  const netBalance = totalIncome - totalExpenses;

  return (
    <div className="px-4 py-6 md:px-8 md:py-10 w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() =>
                handleMonthChange((m) => addMonths(m || currentMonth(), -1))
              }
              aria-label="Previous month"
            >
              <ChevronLeft />
            </Button>
            <span className="text-sm sm:text-base font-semibold w-28 sm:w-auto sm:min-w-36 text-center">
              {getMonthLabel(month)}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() =>
                handleMonthChange((m) => addMonths(m || currentMonth(), 1))
              }
              aria-label="Next month"
            >
              <ChevronRight />
            </Button>
          </div>
          <Button
            variant={month === "" ? "default" : "outline"}
            size="sm"
            onClick={() =>
              handleMonthChange(month === "" ? currentMonth() : "")
            }
            aria-label="Toggle all time view"
            className="text-xs sm:text-sm px-2 sm:px-3"
          >
            All time
          </Button>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" className="flex-1 sm:flex-none" asChild>
            <Link href="/dashboard/categories">Categories</Link>
          </Button>
          <Button
            className="flex-1 sm:flex-none"
            onClick={() => setFormOpen(true)}
          >
            <Plus className="mr-1 h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Add Transaction</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card size="sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Income</CardTitle>
            <ArrowUpCircle className="h-3.5 w-3.5 text-income" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate text-income">
              {formatCurrency(totalIncome)}
            </div>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Expenses</CardTitle>
            <ArrowDownCircle className="h-3.5 w-3.5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate text-destructive">
              {formatCurrency(totalExpenses)}
            </div>
          </CardContent>
        </Card>
        <Card size="sm" className="col-span-2 sm:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Balance</CardTitle>
            <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-lg font-bold truncate",
                netBalance < 0 && "text-destructive"
              )}
            >
              {formatCurrency(netBalance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="p-4 border-b flex flex-col sm:flex-row gap-3">
          <Select
            value={categoryId || "all"}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger className="w-full sm:w-44 h-9">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <div className="flex items-center gap-2">
                    <CategoryIcon name={c.icon} className="size-4 text-muted-foreground" />
                    <span>{c.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={type || "all"} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-full sm:w-36 h-9">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="INCOME">Income</SelectItem>
              <SelectItem value="EXPENSE">Expense</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="p-6 border-b">
            <p className="text-sm text-destructive">
              Failed to load transactions: {error.message}
            </p>
          </div>
        )}

        <CardContent className="p-0">
          <TransactionDataTable transactions={transactions} isLoading={isLoading} />
        </CardContent>
      </Card>

      {!isLoading && data && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {data.total} transaction{data.total !== 1 ? "s" : ""}
          </p>
          {data.pages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft />
              </Button>
              <span className="text-xs text-muted-foreground min-w-20 text-center">
                Page {page} of {data.pages}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                disabled={page >= data.pages}
                aria-label="Next page"
              >
                <ChevronRight />
              </Button>
            </div>
          )}
        </div>
      )}

      <TransactionForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense>
      <TransactionsPageContent />
    </Suspense>
  );
}
