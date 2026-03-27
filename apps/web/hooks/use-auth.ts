import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthCredentials {
  email: string;
  password: string;
}

interface AuthResponse {
  accessToken: string;
}

// ─── useLogin ─────────────────────────────────────────────────────────────────

export function useLogin() {
  const { setTokenAndUser } = useAuth();
  const router = useRouter();

  return useMutation<void, ApiError, AuthCredentials>({
    mutationFn: async (credentials) => {
      const { accessToken } = await apiFetch<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });
      await setTokenAndUser(accessToken);
    },
    onSuccess: () => {
      router.push("/dashboard");
    },
  });
}

// ─── useRegister ──────────────────────────────────────────────────────────────

export function useRegister() {
  const { setTokenAndUser } = useAuth();
  const router = useRouter();

  return useMutation<void, ApiError, AuthCredentials>({
    mutationFn: async (credentials) => {
      const { accessToken } = await apiFetch<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(credentials),
      });
      await setTokenAndUser(accessToken);
    },
    onSuccess: () => {
      router.push("/dashboard");
    },
  });
}

// ─── useLogout ────────────────────────────────────────────────────────────────

export function useLogout() {
  const { accessToken, clearAuth } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<void, ApiError, void>({
    mutationFn: async () => {
      // Best-effort — clear local state regardless of whether the API call succeeds
      await apiFetch("/auth/logout", {
        method: "POST",
        accessToken: accessToken ?? undefined,
      }).catch(() => {});
    },
    onSettled: () => {
      clearAuth();
      // Wipe all cached query data so the next user gets a clean state
      queryClient.clear();
      router.push("/auth/login");
    },
  });
}
