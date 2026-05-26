"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useLogout } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  LayoutDashboard,
  ArrowLeftRight,
  Tags,
  LogOut,
  PiggyBank,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Analytics", href: "/dashboard/analytics", icon: TrendingUp },
  {
    name: "Transactions",
    href: "/dashboard/transactions",
    icon: ArrowLeftRight,
  },
  { name: "Categories", href: "/dashboard/categories", icon: Tags },
  { name: "Budgets", href: "/dashboard/budgets", icon: PiggyBank },
];

export function DashboardSidebar({ className }: { className?: string }) {
  const { user } = useAuth();
  const logout = useLogout();
  const pathname = usePathname();

  return (
    <aside
      className={cn("flex h-full w-64 flex-col border-r bg-card", className)}
    >
      <div className="flex h-16 items-center justify-between border-b px-6">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight">FinFlow</span>
        </div>
        <ThemeToggle />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-6">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-none px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t p-6">
        <div className="mb-6 px-2">
          <p className="truncate text-xs font-medium text-muted-foreground">
            Signed in as
          </p>
          <p className="truncate text-sm font-semibold">{user?.email}</p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 px-2 text-muted-foreground hover:text-destructive"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          <LogOut className="size-4" />
          {logout.isPending ? "Signing out…" : "Sign out"}
        </Button>
      </div>
    </aside>
  );
}
