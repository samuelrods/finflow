"use client";

import { useState } from "react";
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
import { useCreateCategory } from "@/hooks/use-categories";

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormValues {
  name: string;
}

const SUGGESTED_ICONS = [
  "🏠", "🚗", "🛒", "🍔", "☕", "✈️", "🎮", "📚",
  "💊", "👗", "💰", "🎁", "🏋️", "🎵", "🐾", "💡",
  "🔧", "📱", "🏥", "🌿", "🎓", "💼", "🌊", "🎨",
];

export function CategoryForm({ open, onOpenChange }: CategoryFormProps) {
  const [selectedIcon, setSelectedIcon] = useState<string>("");
  const createMutation = useCreateCategory();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { name: "" } });

  const onSubmit = async (values: FormValues) => {
    await createMutation.mutateAsync({
      name: values.name.trim(),
      icon: selectedIcon || undefined,
    });
    reset();
    setSelectedIcon("");
    onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      reset();
      setSelectedIcon("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Category</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-1">
          {/* Icon picker */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center size-10 rounded-lg border bg-muted text-xl shrink-0">
                {selectedIcon || "?"}
              </div>
              <span className="text-sm text-muted-foreground">
                {selectedIcon ? "Selected" : "Pick an icon below or leave blank"}
              </span>
              {selectedIcon && (
                <button
                  type="button"
                  onClick={() => setSelectedIcon("")}
                  className="ml-auto text-xs text-muted-foreground underline hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="grid grid-cols-8 gap-1.5">
              {SUGGESTED_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() =>
                    setSelectedIcon(selectedIcon === emoji ? "" : emoji)
                  }
                  className={`flex items-center justify-center rounded-lg h-9 text-lg transition-all border ${
                    selectedIcon === emoji
                      ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                      : "border-transparent hover:border-border hover:bg-muted"
                  }`}
                  title={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              placeholder="e.g. Groceries"
              aria-invalid={!!errors.name}
              {...register("name", {
                required: "Category name is required",
                maxLength: { value: 50, message: "Name is too long" },
              })}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {createMutation.error && (
            <p className="text-sm text-destructive">
              {createMutation.error.message}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
