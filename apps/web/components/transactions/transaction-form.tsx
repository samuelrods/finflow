"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories } from "@/hooks/use-categories";
import {
  useCreateTransaction,
  useUpdateTransaction,
  CreateTransactionInput,
} from "@/hooks/use-transactions";
import { Transaction } from "@/lib/types";

interface TransactionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction;
}

interface FormValues {
  amount: string;
  description: string;
  date: string;
  type: "INCOME" | "EXPENSE";
  categoryId: string;
}

function toDateInputValue(isoString: string): string {
  return isoString.slice(0, 10);
}

export function TransactionForm({
  open,
  onOpenChange,
  transaction,
}: TransactionFormProps) {
  const isEditing = !!transaction;
  const { data: categories = [] } = useCategories();
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      amount: "",
      description: "",
      date: new Date().toISOString().slice(0, 10),
      type: "EXPENSE",
      categoryId: "",
    },
  });

  useEffect(() => {
    if (transaction) {
      reset({
        amount: transaction.amount,
        description: transaction.description ?? "",
        date: toDateInputValue(transaction.date),
        type: transaction.type,
        categoryId: transaction.categoryId,
      });
    } else {
      reset({
        amount: "",
        description: "",
        date: new Date().toISOString().slice(0, 10),
        type: "EXPENSE",
        categoryId: "",
      });
    }
  }, [transaction, reset]);

  const type = watch("type");
  const categoryId = watch("categoryId");

  const onSubmit = async (values: FormValues) => {
    const payload: CreateTransactionInput = {
      amount: parseFloat(values.amount),
      description: values.description || undefined,
      date: values.date,
      type: values.type,
      categoryId: values.categoryId,
    };
    if (isEditing) {
      await updateMutation.mutateAsync({ id: transaction.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error ?? updateMutation.error;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Transaction" : "Add Transaction"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="flex rounded-lg border border-input overflow-hidden">
            {(["EXPENSE", "INCOME"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setValue("type", t)}
                className={`flex-1 py-1.5 text-sm font-medium transition-colors ${type === t
                    ? t === "INCOME"
                      ? "bg-emerald-600 text-white"
                      : "bg-red-600 text-white"
                    : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
              >
                {t === "INCOME" ? "Income" : "Expense"}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              aria-invalid={!!errors.amount}
              {...register("amount", {
                required: "Amount is required",
                min: { value: 0.01, message: "Must be greater than 0" },
              })}
            />
            {errors.amount && (
              <p className="text-xs text-destructive">
                {errors.amount.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <Select
              value={categoryId}
              onValueChange={(v) => setValue("categoryId", v)}
            >
              <SelectTrigger aria-invalid={!categoryId && isSubmitting}>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.icon ? `${c.icon} ` : ""}
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              type="hidden"
              {...register("categoryId", { required: "Category is required" })}
            />
            {errors.categoryId && (
              <p className="text-xs text-destructive">
                {errors.categoryId.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              aria-invalid={!!errors.date}
              {...register("date", { required: "Date is required" })}
            />
            {errors.date && (
              <p className="text-xs text-destructive">{errors.date.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">
              Description{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="description"
              placeholder="e.g. Grocery shopping"
              {...register("description")}
            />
          </div>

          {mutationError && (
            <p className="text-sm text-destructive">{mutationError.message}</p>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !categoryId}>
              {isPending
                ? isEditing
                  ? "Saving…"
                  : "Adding…"
                : isEditing
                  ? "Save Changes"
                  : "Add Transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
