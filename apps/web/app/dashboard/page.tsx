"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}!
        </h2>
        <p className="text-muted-foreground mt-1">
          Track your income and expenses to stay on top of your finances.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-5 space-y-3 max-w-sm">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Transactions
          </h3>
          <p className="text-sm text-muted-foreground">
            Log your income and expenses, filter by month and category.
          </p>
          <Button asChild size="sm">
            <Link href="/dashboard/transactions">
              View Transactions
              <ArrowRight />
            </Link>
          </Button>
        </div>
    </main>
  );
}
