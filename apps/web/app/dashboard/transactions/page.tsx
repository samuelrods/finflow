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
import { TransactionList } from "@/components/transactions/transaction-list";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { useTransactions } from "@/hooks/use-transactions";
import { useCategories } from "@/hooks/use-categories";
import { TransactionFilters } from "@/lib/types";
import { ArrowLeft, ChevronLeft, ChevronRight, Plus } from "lucide-react";
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
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-1">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Dashboard
        </Link>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => handleMonthChange((m) => addMonths(m || currentMonth(), -1))}
            aria-label="Previous month"
          >
            <ChevronLeft />
          </Button>
          <span className="text-base font-semibold min-w-36 text-center">
            {getMonthLabel(month)}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => handleMonthChange((m) => addMonths(m || currentMonth(), 1))}
            aria-label="Next month"
          >
            <ChevronRight />
          </Button>
          <Button
            variant={month === "" ? "default" : "outline"}
            size="sm"
            onClick={() => handleMonthChange(month === "" ? currentMonth() : "")}
            aria-label="Toggle all time view"
          >
            All time
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/categories">Categories</Link>
          </Button>
          <Button onClick={() => setFormOpen(true)}>
            <Plus />
            Add Transaction
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-background p-4">
          <p className="text-xs text-muted-foreground">Income</p>
          <p className="text-lg font-bold text-emerald-600 mt-1">
            {formatCurrency(totalIncome)}
          </p>
        </div>
        <div className="rounded-xl border bg-background p-4">
          <p className="text-xs text-muted-foreground">Expenses</p>
          <p className="text-lg font-bold text-red-600 mt-1">
            {formatCurrency(totalExpenses)}
          </p>
        </div>
        <div className="rounded-xl border bg-background p-4">
          <p className="text-xs text-muted-foreground">Balance</p>
          <p
            className={`text-lg font-bold mt-1 ${netBalance >= 0 ? "text-emerald-600" : "text-red-600"}`}
          >
            {formatCurrency(netBalance)}
          </p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select
          value={categoryId || "all"}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.icon ? `${c.icon} ` : ""}
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={type || "all"}
          onValueChange={handleTypeChange}
        >
          <SelectTrigger className="w-36">
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
        <p className="text-sm text-destructive">
          Failed to load transactions: {error.message}
        </p>
      )}

      <TransactionList transactions={transactions} isLoading={isLoading} />

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
