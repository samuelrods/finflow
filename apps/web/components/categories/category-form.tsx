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
import { CategoryIcon } from "@/components/ui/category-icon";

interface CategoryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormValues {
  name: string;
}

const SUGGESTED_ICONS = [
  "Home", "Car", "ShoppingCart", "Utensils", "Coffee", "Plane", "Gamepad2", "BookText",
  "Pill", "Shirt", "Banknote", "Gift", "Dumbbell", "Music", "PawPrint", "Lightbulb",
  "Wrench", "Smartphone", "Hospital", "Leaf", "GraduationCap", "Briefcase", "Waves", "Palette",
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
              <div className="flex items-center justify-center size-10 rounded-none border bg-muted text-muted-foreground shrink-0">
                <CategoryIcon name={selectedIcon} className="size-5" fallback="?" />
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
              {SUGGESTED_ICONS.map((iconName) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() =>
                    setSelectedIcon(selectedIcon === iconName ? "" : iconName)
                  }
                  className={`flex items-center justify-center rounded-none h-9 transition-all border ${
                    selectedIcon === iconName
                      ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                      : "border-transparent hover:border-border hover:bg-muted"
                  }`}
                  title={iconName}
                >
                  <CategoryIcon name={iconName} className="size-5 text-muted-foreground" />
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
