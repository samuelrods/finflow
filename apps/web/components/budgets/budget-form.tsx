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
import { CategoryIcon } from "@/components/ui/category-icon";
import { useCategories } from "@/hooks/use-categories";
import { useCreateBudget, useUpdateBudget } from "@/hooks/use-budgets";
import { Budget } from "@/lib/types";

interface BudgetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedBudget: Budget | null; // null if creating, otherwise editing
  month: number;
  year: number;
  existingCategoryIds: string[]; // categories that already have a budget in the month
}

interface FormValues {
  categoryId: string;
  amount: string;
}

export function BudgetForm({
  open,
  onOpenChange,
  selectedBudget,
  month,
  year,
  existingCategoryIds,
}: BudgetFormProps) {
  const { data: categories = [] } = useCategories();
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      categoryId: "",
      amount: "",
    },
  });

  const categoryIdValue = watch("categoryId");

  // Prefill when editing
  useEffect(() => {
    if (open) {
      if (selectedBudget) {
        setValue("categoryId", selectedBudget.categoryId);
        setValue("amount", Number(selectedBudget.amount).toString());
      } else {
        reset({
          categoryId: "",
          amount: "",
        });
      }
    }
  }, [open, selectedBudget, setValue, reset]);

  const onSubmit = async (values: FormValues) => {
    const amountNum = parseFloat(values.amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    if (selectedBudget) {
      await updateMutation.mutateAsync({
        id: selectedBudget.id,
        amount: amountNum,
      });
    } else {
      await createMutation.mutateAsync({
        amount: amountNum,
        month,
        year,
        categoryId: values.categoryId,
      });
    }

    onOpenChange(false);
    reset();
  };

  const handleOpenChange = (openVal: boolean) => {
    if (!openVal) {
      reset();
    }
    onOpenChange(openVal);
  };

  // Filter out categories that already have a budget (except the current one we are editing)
  const availableCategories = categories.filter(
    (c) =>
      !existingCategoryIds.includes(c.id) ||
      (selectedBudget && selectedBudget.categoryId === c.id),
  );

  const isPending = createMutation.isPending || updateMutation.isPending;
  const errorMsg = createMutation.error?.message || updateMutation.error?.message;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {selectedBudget ? "Edit Budget Limit" : "Set Monthly Budget"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-1">
          {/* Category Selector */}
          <div className="space-y-1.5">
            <Label htmlFor="budget-category">Category</Label>
            {selectedBudget ? (
              <div className="flex items-center gap-2 px-3 py-2 border rounded-none bg-muted text-muted-foreground select-none">
                <CategoryIcon
                  name={selectedBudget.category.icon}
                  className="size-4"
                />
                <span>{selectedBudget.category.name}</span>
              </div>
            ) : (
              <Select
                value={categoryIdValue}
                onValueChange={(val) => setValue("categoryId", val, { shouldValidate: true })}
                disabled={isPending}
              >
                <SelectTrigger id="budget-category" className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.length === 0 ? (
                    <SelectItem value="none" disabled>
                      All categories have budgets
                    </SelectItem>
                  ) : (
                    availableCategories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <CategoryIcon
                            name={c.icon}
                            className="size-4 text-muted-foreground"
                          />
                          <span>{c.name}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
            <input
              type="hidden"
              {...register("categoryId", {
                required: !selectedBudget ? "Category is required" : false,
              })}
            />
            {errors.categoryId && !selectedBudget && (
              <p className="text-xs text-destructive">
                {errors.categoryId.message}
              </p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="budget-amount">Budget Limit ($)</Label>
            <Input
              id="budget-amount"
              type="number"
              step="0.01"
              placeholder="e.g. 500.00"
              disabled={isPending}
              aria-invalid={!!errors.amount}
              {...register("amount", {
                required: "Amount is required",
                validate: (v) =>
                  parseFloat(v) > 0 || "Amount must be greater than 0",
              })}
            />
            {errors.amount && (
              <p className="text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          {errorMsg && <p className="text-sm text-destructive">{errorMsg}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saving…"
                : selectedBudget
                  ? "Save Limit"
                  : "Set Budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
