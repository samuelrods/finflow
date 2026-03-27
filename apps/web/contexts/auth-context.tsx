"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { apiFetch, refreshAccessToken } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthUser {
  id: string;
  email: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  /** True while the initial silent refresh is in progress on mount */
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  setTokenAndUser: (accessToken: string) => Promise<void>;
  clearAuth: () => void;
  /** Used by the API client to update the token after a silent refresh */
  updateAccessToken: (token: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Prevent double-initialisation in React StrictMode (double-invoke in dev)
  const initRef = useRef(false);

  /**
   * Fetches /users/me using a known-good access token and stores the user.
   */
  const setTokenAndUser = useCallback(async (token: string): Promise<void> => {
    setAccessToken(token);
    const fetchedUser = await apiFetch<AuthUser>("/users/me", {
      accessToken: token,
    });
    setUser(fetchedUser);
  }, []);

  const clearAuth = useCallback((): void => {
    setAccessToken(null);
    setUser(null);
  }, []);

  const updateAccessToken = useCallback((token: string): void => {
    setAccessToken(token);
  }, []);

  /**
   * On mount: attempt a silent token refresh using the httpOnly cookie.
   * This restores the session after a page reload without requiring re-login.
   * If the cookie is absent or expired, the user stays unauthenticated silently.
   */
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    refreshAccessToken().then(async (result) => {
      if (result.success) {
        try {
          await setTokenAndUser(result.accessToken);
        } catch {
          // /users/me failed even with a valid token — clear state
          clearAuth();
        }
      }
      setIsLoading(false);
    });
  }, [setTokenAndUser, clearAuth]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isLoading,
      isAuthenticated: !!accessToken && !!user,
      setTokenAndUser,
      clearAuth,
      updateAccessToken,
    }),
    [
      user,
      accessToken,
      isLoading,
      setTokenAndUser,
      clearAuth,
      updateAccessToken,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
