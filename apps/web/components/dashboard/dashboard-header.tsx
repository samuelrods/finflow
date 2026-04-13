"use client";

import { useAuth } from "@/contexts/auth-context";
import { useLogout } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";

export function DashboardHeader() {
  const { user } = useAuth();
  const logout = useLogout();

  return (
    <header className="border-b bg-white px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <TrendingUp className="size-5 text-primary" />
        <h1 className="text-xl font-semibold">FinFlow</h1>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">{user?.email}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          {logout.isPending ? "Signing out…" : "Sign out"}
        </Button>
      </div>
    </header>
  );
}
