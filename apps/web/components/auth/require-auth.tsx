"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

interface RequireAuthProps {
  children: React.ReactNode;
}

/**
 * Wraps any page that requires authentication.
 * While the initial token refresh is in progress, renders nothing (avoids flash).
 * Once resolved, redirects to login if unauthenticated.
 *
 * Usage: wrap the layout of any protected route group with this component.
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Show nothing while resolving — prevents a flash of protected content
  if (isLoading) return null;
  if (!isAuthenticated) return null;

  return <>{children}</>;
}
