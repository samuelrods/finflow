"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";

interface RedirectIfAuthenticatedProps {
  children: React.ReactNode;
}

/**
 * Wraps any page that should only be accessible to unauthenticated users
 * (e.g. login, register).
 * While the initial token refresh is in progress, renders nothing (avoids flash).
 * Once resolved, redirects to /dashboard if already authenticated.
 *
 * Usage: wrap the layout of any auth route group with this component.
 */
export function RedirectIfAuthenticated({
  children,
}: RedirectIfAuthenticatedProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, router]);

  // Show nothing while resolving — prevents a flash of auth page content
  if (isLoading) return null;
  if (isAuthenticated) return null;

  return <>{children}</>;
}
