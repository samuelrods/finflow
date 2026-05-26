import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { Budget } from "@/lib/types";

export const budgetKeys = {
  all: ["budgets"] as const,
  lists: () => [...budgetKeys.all, "list"] as const,
  list: (filters: { month?: number; year?: number }) =>
    [...budgetKeys.lists(), filters] as const,
};

function useApiOptions() {
  const { accessToken, updateAccessToken, clearAuth } = useAuth();
  return {
    accessToken: accessToken ?? undefined,
    onTokenRefreshed: updateAccessToken,
    onAuthFailure: clearAuth,
  };
}

export function useBudgets(filters: { month?: number; year?: number } = {}) {
  const opts = useApiOptions();
  const queryParams = new URLSearchParams();
  if (filters.month !== undefined) queryParams.set("month", filters.month.toString());
  if (filters.year !== undefined) queryParams.set("year", filters.year.toString());

  const queryString = queryParams.toString();
  const path = queryString ? `/budgets?${queryString}` : "/budgets";

  return useQuery<Budget[], ApiError>({
    queryKey: budgetKeys.list(filters),
    queryFn: () => apiFetch<Budget[]>(path, opts),
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  const opts = useApiOptions();

  return useMutation<
    Budget,
    ApiError,
    { amount: number; month: number; year: number; categoryId: string }
  >({
    mutationFn: (body) =>
      apiFetch<Budget>("/budgets", {
        method: "POST",
        body: JSON.stringify(body),
        ...opts,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  const opts = useApiOptions();

  return useMutation<Budget, ApiError, { id: string; amount: number }>({
    mutationFn: ({ id, amount }) =>
      apiFetch<Budget>(`/budgets/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ amount }),
        ...opts,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  const opts = useApiOptions();

  return useMutation<void, ApiError, string>({
    mutationFn: (id) =>
      apiFetch<void>(`/budgets/${id}`, { method: "DELETE", ...opts }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.all });
    },
  });
}
