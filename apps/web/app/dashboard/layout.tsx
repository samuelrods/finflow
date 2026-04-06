import { RequireAuth } from "@/components/auth/require-auth";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader />
        {children}
      </div>
    </RequireAuth>
  );
}
