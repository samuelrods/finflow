"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { BudgetForm } from "@/components/budgets/budget-form";
import { useBudgets, useDeleteBudget } from "@/hooks/use-budgets";
import { Budget } from "@/lib/types";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  TrendingDown,
  AlertTriangle,
  PiggyBank,
  CheckCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

function getMonthLabel(month: number, year: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1));
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default function BudgetsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [formOpen, setFormOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);

  const { data: budgets = [], isLoading, error } = useBudgets({ month, year });
  const deleteMutation = useDeleteBudget();

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleEdit = (budget: Budget) => {
    setSelectedBudget(budget);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setSelectedBudget(null);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this budget limit?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const totalBudgeted = budgets.reduce((sum, b) => sum + Number(b.amount), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const remainingBudget = totalBudgeted - totalSpent;
  const overallProgress = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

  const existingCategoryIds = budgets.map((b) => b.categoryId);

  return (
    <div className="px-4 py-6 md:px-8 md:py-10 w-full space-y-6">
      {/* Header and navigation */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={handlePrevMonth}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-base font-semibold w-28 sm:w-auto sm:min-w-36 text-center">
            {getMonthLabel(month, year)}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={handleNextMonth}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          Set Budget Limit
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">
          Failed to load budgets: {error.message}
        </p>
      )}

      {/* Summary grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card size="sm" className="shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Budgeted
            </CardTitle>
            <PiggyBank className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate text-primary">
              {formatCurrency(totalBudgeted)}
            </div>
            <p className="text-xxs text-muted-foreground mt-0.5">
              Limit for {getMonthLabel(month, year)}
            </p>
          </CardContent>
        </Card>

        <Card size="sm" className="shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Spent
            </CardTitle>
            <TrendingDown
              className={cn(
                "h-4 w-4",
                remainingBudget < 0 ? "text-destructive" : "text-muted-foreground"
              )}
            />
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold truncate",
                remainingBudget < 0 && "text-destructive"
              )}
            >
              {formatCurrency(totalSpent)}
            </div>
            <p className="text-xxs text-muted-foreground mt-0.5">
              Across budgeted categories
            </p>
          </CardContent>
        </Card>

        <Card size="sm" className="shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {remainingBudget >= 0 ? "Remaining Budget" : "Over Budget"}
            </CardTitle>
            {remainingBudget >= 0 ? (
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-destructive animate-pulse" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold truncate",
                remainingBudget < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-500"
              )}
            >
              {formatCurrency(Math.abs(remainingBudget))}
            </div>
            <p className="text-xxs text-muted-foreground mt-0.5">
              {remainingBudget >= 0 ? "Safe to spend" : "Above total limits"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress Card */}
      {totalBudgeted > 0 && (
        <Card className="shadow-sm hover:shadow-md transition-all border-l-4 border-l-primary">
          <CardContent className="py-4 px-6 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium">Overall Budget Usage</span>
              <span className="font-semibold text-muted-foreground">
                {overallProgress.toFixed(0)}% Used
              </span>
            </div>
            <div className="h-3.5 w-full bg-muted overflow-hidden relative border">
              <div
                className={cn(
                  "h-full transition-all duration-500 ease-out",
                  overallProgress > 100
                    ? "bg-destructive"
                    : overallProgress >= 80
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                )}
                style={{ width: `${Math.min(overallProgress, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget list */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Category Budgets
        </h3>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-20 w-full animate-pulse border bg-muted/20"
              />
            ))}
          </div>
        ) : budgets.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-12 px-4 text-center border-dashed">
            <div className="flex items-center justify-center size-14 rounded-full bg-primary/10 mb-4">
              <PiggyBank className="size-7 text-primary" />
            </div>
            <h4 className="text-base font-semibold">No budgets configured</h4>
            <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-6">
              Create monthly budget limits for your categories to track and reduce
              unnecessary expenses.
            </p>
            <Button onClick={handleCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create First Budget
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgets.map((budget) => {
              const limit = Number(budget.amount);
              const percent = limit > 0 ? (budget.spent / limit) * 100 : 0;
              const isOver = budget.spent > limit;
              const isNear = percent >= 80;

              return (
                <Card
                  key={budget.id}
                  className={cn(
                    "shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 duration-200 border-l-4",
                    isOver
                      ? "border-l-destructive"
                      : isNear
                        ? "border-l-amber-500"
                        : "border-l-emerald-500"
                  )}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center size-9 rounded-none border bg-muted shrink-0">
                        <CategoryIcon
                          name={budget.category.icon}
                          className="size-5 text-muted-foreground"
                        />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold truncate max-w-36 sm:max-w-48">
                          {budget.category.name}
                        </CardTitle>
                        <CardDescription className="text-xxs">
                          {percent.toFixed(0)}% Used
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleEdit(budget)}
                        aria-label="Edit budget"
                      >
                        <Pencil className="size-3.5 text-muted-foreground hover:text-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleDelete(budget.id)}
                        disabled={deleteMutation.isPending}
                        aria-label="Delete budget"
                      >
                        <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {/* Spent / Limit Text */}
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="font-semibold">{formatCurrency(budget.spent)}</span>
                      <span className="text-muted-foreground text-xxs">
                        of {formatCurrency(limit)} limit
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 w-full bg-muted overflow-hidden relative border">
                      <div
                        className={cn(
                          "h-full transition-all duration-300 ease-out",
                          isOver
                            ? "bg-destructive"
                            : isNear
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        )}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>

                    {/* Remaining / Over Indicator */}
                    <div className="flex justify-between items-center text-xxs">
                      {isOver ? (
                        <span className="text-destructive font-medium flex items-center gap-1">
                          <AlertTriangle className="size-3" />
                          Over by {formatCurrency(budget.spent - limit)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {formatCurrency(limit - budget.spent)} remaining
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <BudgetForm
        open={formOpen}
        onOpenChange={setFormOpen}
        selectedBudget={selectedBudget}
        month={month}
        year={year}
        existingCategoryIds={existingCategoryIds}
      />
    </div>
  );
}
