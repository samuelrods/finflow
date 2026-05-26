"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Wallet,
  Flame,
  AlertCircle,
  ShoppingBag,
  PiggyBank,
} from "lucide-react";
import { useAnalytics } from "@/hooks/use-transactions";
import { useBudgets } from "@/hooks/use-budgets";
import { cn } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, ComposedChart, Line, CartesianGrid, XAxis, Pie, PieChart, Cell } from "recharts";

// ─── Sub-Components ─────────────────────────────────────────────────────────

function MonthSelector({ monthStr, onChange }: { monthStr: string; onChange: (m: string) => void }) {
  const navigateMonth = (direction: -1 | 1) => {
    const [year, m] = monthStr.split("-").map(Number);
    const date = new Date(year, m - 1 + direction, 1);
    onChange(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <div className="flex items-center space-x-2">
      <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)} className="rounded-none">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Input
        type="month"
        value={monthStr}
        onChange={(e) => onChange(e.target.value)}
        className="w-auto font-medium rounded-none"
      />
      <Button variant="outline" size="icon" onClick={() => navigateMonth(1)} className="rounded-none">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function SavingsRateCard({ rate, change, status }: { rate: number; change: number; status: "good" | "average" | "poor" }) {
  const colors = { good: "text-emerald-500", average: "text-amber-500", poor: "text-rose-500" };
  return (
    <Card className="bg-card/40 backdrop-blur-md border border-border/50 shadow-lg transition-all duration-300 hover:shadow-primary/5 hover:border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
          Savings Rate <Wallet className="h-4 w-4 text-primary" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline space-x-2">
          <span className={`text-4xl font-extrabold tracking-tight ${colors[status]}`}>{rate}%</span>
          <span className="text-xs text-muted-foreground capitalize font-semibold bg-muted px-2 py-0.5">{status}</span>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <span className={change >= 0 ? "text-emerald-500 font-semibold" : "text-rose-500 font-semibold"}>
            {change >= 0 ? "▲" : "▼"} {Math.abs(change)}%
          </span> since last month
        </p>
      </CardContent>
    </Card>
  );
}

function BudgetAdherenceCard({
  adherence,
  isLoading,
}: {
  adherence: { rate: number; keptCount: number; totalCount: number } | null;
  isLoading: boolean;
}) {
  return (
    <Card className="bg-card/40 backdrop-blur-md border border-border/50 shadow-lg transition-all duration-300 hover:shadow-primary/5 hover:border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
          Budget Adherence <PiggyBank className="h-4 w-4 text-primary" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Skeleton className="h-8 w-28" />
        ) : adherence ? (
          <>
            <div className="flex items-baseline space-x-2">
              <span
                className={cn(
                  "text-4xl font-extrabold tracking-tight",
                  adherence.rate >= 90
                    ? "text-emerald-500"
                    : adherence.rate >= 70
                      ? "text-amber-500"
                      : "text-rose-500"
                )}
              >
                {adherence.rate}%
              </span>
              <span className="text-xs text-muted-foreground font-semibold bg-muted px-2 py-0.5">
                {adherence.keptCount} of {adherence.totalCount} Kept
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {adherence.rate === 100
                ? "Perfect budget execution this month!"
                : `${adherence.totalCount - adherence.keptCount} budgets exceeded.`}
            </p>
          </>
        ) : (
          <div className="space-y-1">
            <div className="text-lg font-bold text-muted-foreground py-1">No Budgets</div>
            <p className="text-xs text-muted-foreground">Set limits on Budgets page</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TopCategoryCard({ data }: { data: { name: string; total: number; percentage: number } | null }) {
  return (
    <Card className="bg-card/40 backdrop-blur-md border border-border/50 shadow-lg transition-all duration-300 hover:shadow-primary/5 hover:border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
          Top Expense Category <ShoppingBag className="h-4 w-4 text-primary" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data ? (
          <>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold tracking-tight text-foreground truncate max-w-[150px]" title={data.name}>
                {data.name}
              </span>
              <span className="text-xs text-muted-foreground font-semibold bg-muted px-2 py-0.5">{data.percentage}%</span>
            </div>
            <p className="text-xs text-muted-foreground">Total spent: <span className="font-semibold text-foreground">${data.total.toFixed(2)}</span></p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground py-2">No expenses found.</p>
        )}
      </CardContent>
    </Card>
  );
}

function SpendingVelocityCard({ data }: { data: { currentMtd: number; previousMtd: number; percentageChange: number; isFaster: boolean } }) {
  return (
    <Card className="bg-card/40 backdrop-blur-md border border-border/50 shadow-lg transition-all duration-300 hover:shadow-primary/5 hover:border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
          Spending Speed <Flame className="h-4 w-4 text-primary" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline space-x-2">
          <span className={`text-3xl font-extrabold tracking-tight ${data.isFaster ? "text-rose-500" : "text-emerald-500"}`}>
            {data.isFaster ? "Faster" : "Slower"}
          </span>
          <span className="text-xs text-muted-foreground font-semibold bg-muted px-2 py-0.5">
            {data.percentageChange >= 0 ? `+${data.percentageChange}` : data.percentageChange}%
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Spent <span className="font-semibold text-foreground">${data.currentMtd.toFixed(2)}</span> vs last MTD <span className="font-semibold text-foreground">${data.previousMtd.toFixed(2)}</span>
        </p>
      </CardContent>
    </Card>
  );
}

function LargeExpensesCard({ data }: { data: { id: string; amount: number; description: string | null; date: string; categoryName: string }[] }) {
  return (
    <Card className="bg-card/40 backdrop-blur-md border border-border/50 shadow-lg col-span-1 md:col-span-3">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
          Large Expenses (≥$100) <AlertCircle className="h-4 w-4 text-primary" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.length > 0 ? (
          data.map((tx) => (
            <div key={tx.id} className="flex justify-between items-center py-1.5 border-b border-border/20 last:border-0 hover:bg-muted/10 transition-colors">
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold truncate">{tx.description || "Expense"}</span>
                <span className="text-xs text-muted-foreground">{tx.categoryName} • {tx.date}</span>
              </div>
              <span className="text-sm font-bold text-destructive font-mono">-${tx.amount.toFixed(2)}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">No large expenses detected in this period.</p>
        )}
      </CardContent>
    </Card>
  );
}

function aggregateWeekly(trends: { date: string; income: number; expense: number }[]) {
  const result: { name: string; income: number; expense: number }[] = [];
  for (let i = 0; i < trends.length; i += 7) {
    const chunk = trends.slice(i, i + 7);
    result.push({
      name: `W${Math.floor(i / 7) + 1}`,
      income: Number(chunk.reduce((s, d) => s + d.income, 0).toFixed(2)),
      expense: Number(chunk.reduce((s, d) => s + d.expense, 0).toFixed(2)),
    });
  }
  return result;
}

function aggregateCumulative(trends: { date: string; income: number; expense: number }[]) {
  let inc = 0;
  let exp = 0;
  return trends.map((d) => {
    inc += d.income;
    exp += d.expense;
    return {
      name: d.date.slice(-2),
      income: Number(inc.toFixed(2)),
      expense: Number(exp.toFixed(2)),
    };
  });
}

function IncomeExpenseAreaChart({ trends }: { trends: { date: string; income: number; expense: number }[] }) {
  const [view, setView] = useState<"daily" | "weekly" | "cumulative">("daily");

  const chartData = useMemo(() => {
    if (view === "weekly") return aggregateWeekly(trends);
    if (view === "cumulative") return aggregateCumulative(trends);
    return trends.map((d) => ({ name: d.date.slice(-2), income: d.income, expense: d.expense }));
  }, [trends, view]);

  const config = {
    income: { label: "Income", color: "#10b981" },
    expense: { label: "Expenses", color: "#f43f5e" },
  };

  return (
    <Card className="col-span-1 lg:col-span-4 bg-card/40 backdrop-blur-md border border-border/50 shadow-lg">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4">
        <div>
          <CardTitle className="text-lg font-bold">Cash Flow Trend</CardTitle>
          <CardDescription>Income vs expenses over this month</CardDescription>
        </div>
        <div className="flex bg-muted p-0.5 rounded-none border self-start md:self-auto">
          {(["daily", "weekly", "cumulative"] as const).map((v) => (
            <Button key={v} variant={view === v ? "secondary" : "ghost"} size="sm" onClick={() => setView(v)} className="capitalize rounded-none text-xs h-7 px-2">
              {v}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[280px] w-full">
          <AreaChart data={chartData} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorInc)" />
            <Area type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExp)" />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function CategoryDonutChart({ data }: { data: { categoryId: string; categoryName: string; total: number; percentage: number }[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const selectedCategory = useMemo(() => {
    return data.find((c) => c.categoryId === activeId) || data[0];
  }, [data, activeId]);

  const config = useMemo(() => {
    const cfg: Record<string, { label: string; color?: string }> = { total: { label: "Total Spent" } };
    data.forEach((c, idx) => {
      cfg[c.categoryName] = { label: c.categoryName, color: `var(--chart-${(idx % 5) + 1})` };
    });
    return cfg;
  }, [data]);

  const chartColors = ["#6366f1", "#f59e0b", "#10b981", "#06b6d4", "#8b5cf6"];

  return (
    <Card className="col-span-1 lg:col-span-3 bg-card/40 backdrop-blur-md border border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Category Distribution</CardTitle>
        <CardDescription>Click a slice to view details</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {data.length > 0 ? (
          <>
            <ChartContainer config={config} className="h-[200px] w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie
                  data={data}
                  dataKey="total"
                  nameKey="categoryName"
                  innerRadius={55}
                  outerRadius={75}
                  onClick={(entry) => {
                    const payload = entry as unknown as { payload?: { categoryId: string } };
                    if (payload.payload?.categoryId) {
                      setActiveId(payload.payload.categoryId);
                    }
                  }}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={entry.categoryId}
                      fill={chartColors[index % chartColors.length]}
                      stroke={activeId === entry.categoryId ? "#ffffff" : "none"}
                      strokeWidth={2}
                      className="cursor-pointer transition-all duration-300 hover:opacity-80"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            {selectedCategory && (
              <div className="mt-4 text-center space-y-1">
                <p className="text-sm font-semibold">{selectedCategory.categoryName}</p>
                <p className="text-2xl font-black text-destructive font-mono">-${selectedCategory.total.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{selectedCategory.percentage}% of overall expenses</p>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground py-10">No expense categories found.</p>
        )}
      </CardContent>
    </Card>
  );
}

function MonthlyBarChart({ history }: { history: { month: string; income: number; expense: number; budget?: number; savingsRate: number }[] }) {
  const config = {
    income: { label: "Income", color: "#10b981" },
    expense: { label: "Expenses", color: "#f43f5e" },
    budget: { label: "Budget Limit", color: "#6366f1" },
  };

  const chartData = useMemo(() => {
    return history.map((h) => ({
      ...h,
      label: new Date(h.month + "-02").toLocaleString("default", { month: "short" }),
    }));
  }, [history]);

  return (
    <Card className="col-span-1 lg:col-span-7 bg-card/40 backdrop-blur-md border border-border/50 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-bold">Monthly Comparison</CardTitle>
        <CardDescription>Income vs Expenses vs Budget Limit over the last 6 months</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-[260px] w-full">
          <ComposedChart data={chartData} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="income" fill="#10b981" radius={[0, 0, 0, 0]} maxBarSize={25} />
            <Bar dataKey="expense" fill="#f43f5e" radius={[0, 0, 0, 0]} maxBarSize={25} />
            <Line type="monotone" dataKey="budget" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, strokeWidth: 1 }} activeDot={{ r: 6 }} />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────

export default function AnalyticsPage() {
  const currentDate = new Date();
  const initialMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
  const [monthStr, setMonthStr] = useState(initialMonthStr);

  const { data: analyticsData, isLoading, error } = useAnalytics({ month: monthStr });

  const [year, month] = useMemo(() => {
    const [y, m] = monthStr.split("-").map(Number);
    return [y, m];
  }, [monthStr]);

  const { data: budgetsData = [], isLoading: isLoadingBudgets } = useBudgets({ month, year });

  const budgetAdherence = useMemo(() => {
    if (budgetsData.length === 0) return null;
    const keptCount = budgetsData.filter((b) => b.spent <= Number(b.amount)).length;
    const totalCount = budgetsData.length;
    const rate = Math.round((keptCount / totalCount) * 100);
    return { rate, keptCount, totalCount };
  }, [budgetsData]);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center text-center">
        <p className="text-rose-500 font-semibold">Failed to load analytics. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="relative px-4 py-6 md:px-8 md:py-10 w-full space-y-6 overflow-hidden">
      {/* Decorative Glow elements */}
      <div className="absolute top-[-10%] left-[-10%] -z-10 h-[250px] w-[250px] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] -z-10 h-[250px] w-[250px] rounded-full bg-income/10 blur-[120px] pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="text-primary size-8" />
            Financial Analytics
          </h2>
          <p className="text-muted-foreground mt-1">
            Deep dive into your monthly spending behaviors and historical insights.
          </p>
        </div>

        <MonthSelector monthStr={monthStr} onChange={setMonthStr} />
      </div>

      {isLoading || !analyticsData ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <Skeleton key={n} className="h-32 w-full" />
          ))}
          <Skeleton className="col-span-1 lg:col-span-4 h-80 w-full" />
          <Skeleton className="col-span-1 lg:col-span-3 h-80 w-full" />
          <Skeleton className="col-span-1 lg:col-span-7 h-80 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Insights Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SavingsRateCard
              rate={analyticsData.insights.savingsRate.current}
              change={analyticsData.insights.savingsRate.change}
              status={analyticsData.insights.savingsRate.status}
            />
            <BudgetAdherenceCard adherence={budgetAdherence} isLoading={isLoadingBudgets} />
            <TopCategoryCard data={analyticsData.insights.topCategory} />
            <SpendingVelocityCard data={analyticsData.insights.spendingVelocity} />
          </div>

          {/* Interactive Charts */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            <IncomeExpenseAreaChart trends={analyticsData.trends} />
            <CategoryDonutChart data={analyticsData.categories} />
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-10">
            <div className="lg:col-span-7">
              <MonthlyBarChart history={analyticsData.history} />
            </div>
            <div className="lg:col-span-3">
              <LargeExpensesCard data={analyticsData.insights.largeTransactions} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
