"use client";

import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { user } = useAuth();

  return (
          </Button>
        </div>
      <main className="p-6">
        <p className="text-muted-foreground">Dashboard coming soon.</p>
      </main>
  );
}
