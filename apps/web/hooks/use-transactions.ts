import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import {
  Transaction,
  TransactionFilters,
  TransactionListResponse,
  AnalyticsResponse,
} from "@/lib/types";

export const transactionKeys = {
  all: ["transactions"] as const,
  list: (filters: TransactionFilters) =>
    ["transactions", "list", filters] as const,
  detail: (id: string) => ["transactions", "detail", id] as const,
  analytics: (filters: { month?: string }) =>
    ["transactions", "analytics", filters] as const,
};

function useApiOptions() {
  const { accessToken, updateAccessToken, clearAuth } = useAuth();
  return {
    accessToken: accessToken ?? undefined,
    onTokenRefreshed: updateAccessToken,
    onAuthFailure: clearAuth,
  };
}

function buildQuery(filters: TransactionFilters): string {
  const params = new URLSearchParams();
  if (filters.month) params.set("month", filters.month);
  if (filters.categoryId) params.set("categoryId", filters.categoryId);
  if (filters.type) params.set("type", filters.type);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function useTransactions(filters: TransactionFilters = {}) {
  const opts = useApiOptions();
  return useQuery<TransactionListResponse, ApiError>({
    queryKey: transactionKeys.list(filters),
    queryFn: () =>
      apiFetch<TransactionListResponse>(
        `/transactions${buildQuery(filters)}`,
        opts,
      ),
  });
}

export interface CreateTransactionInput {
  amount: number;
  description?: string;
  date: string; // YYYY-MM-DD
  type: "INCOME" | "EXPENSE";
  categoryId: string;
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const opts = useApiOptions();

  return useMutation<Transaction, ApiError, CreateTransactionInput>({
    mutationFn: (body) =>
      apiFetch<Transaction>("/transactions", {
        method: "POST",
        body: JSON.stringify(body),
        ...opts,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  const opts = useApiOptions();

  return useMutation<
    Transaction,
    ApiError,
    { id: string } & Partial<CreateTransactionInput>
  >({
    mutationFn: ({ id, ...body }) =>
      apiFetch<Transaction>(`/transactions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
        ...opts,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const opts = useApiOptions();

  return useMutation<void, ApiError, string>({
    mutationFn: (id) =>
      apiFetch<void>(`/transactions/${id}`, { method: "DELETE", ...opts }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
}

export function useAnalytics(filters: { month?: string } = {}) {
  const opts = useApiOptions();
  const params = new URLSearchParams();
  if (filters.month) params.set("month", filters.month);
  const qs = params.toString();
  const queryStr = qs ? `?${qs}` : "";

  return useQuery<AnalyticsResponse, ApiError>({
    queryKey: transactionKeys.analytics(filters),
    queryFn: () =>
      apiFetch<AnalyticsResponse>(`/transactions/analytics${queryStr}`, opts),
  });
}
