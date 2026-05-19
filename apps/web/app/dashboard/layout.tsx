import { RequireAuth } from "@/components/auth/require-auth";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, TrendingUp } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <div className="flex h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <DashboardSidebar className="hidden lg:flex" />

        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile Header */}
          <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:hidden">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-6 text-primary" />
              <span className="text-xl font-bold tracking-tight">FinFlow</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="size-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="p-0">
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  <SheetDescription className="sr-only">
                    Access dashboard navigation links.
                  </SheetDescription>
                  <DashboardSidebar className="w-full border-none" />
                </SheetContent>
              </Sheet>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-muted/20">
            {children}
          </main>
        </div>
      </div>
    </RequireAuth>
  );
}
