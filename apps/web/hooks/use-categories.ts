import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { Category } from "@/lib/types";

export const categoryKeys = {
  all: ["categories"] as const,
};

function useApiOptions() {
  const { accessToken, updateAccessToken, clearAuth } = useAuth();
  return {
    accessToken: accessToken ?? undefined,
    onTokenRefreshed: updateAccessToken,
    onAuthFailure: clearAuth,
  };
}

export function useCategories() {
  const opts = useApiOptions();
  return useQuery<Category[], ApiError>({
    queryKey: categoryKeys.all,
    queryFn: () => apiFetch<Category[]>("/categories", opts),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const opts = useApiOptions();

  return useMutation<Category, ApiError, { name: string; icon?: string }>({
    mutationFn: (body) =>
      apiFetch<Category>("/categories", {
        method: "POST",
        body: JSON.stringify(body),
        ...opts,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const opts = useApiOptions();

  return useMutation<void, ApiError, string>({
    mutationFn: (id) =>
      apiFetch<void>(`/categories/${id}`, { method: "DELETE", ...opts }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}
