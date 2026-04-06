"use client";

import { useState } from "react";
import { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useDeleteCategory } from "@/hooks/use-categories";
import { Trash2 } from "lucide-react";
import Link from "next/link";

function DeleteConfirmDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category;
}) {
  const deleteMutation = useDeleteCategory();

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(category.id);
      onOpenChange(false);
    } catch {
      // Error is already captured in deleteMutation.error — keep the dialog
      // open so the user can read the message.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Category</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">
              {category.icon ? `${category.icon} ` : ""}
              {category.name}
            </span>
            ? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {deleteMutation.error && (
          <p className="text-sm text-destructive">
            {deleteMutation.error.message}{" "}
            <Link
              href={`/dashboard/transactions?categoryId=${category.id}`}
              className="underline hover:no-underline"
            >
              View transactions
            </Link>
          </p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CategoryList({
  categories,
  isLoading,
}: {
  categories: Category[];
  isLoading: boolean;
}) {
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(
    null
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground text-sm">No custom categories yet.</p>
        <p className="text-muted-foreground text-xs mt-1">
          Add your first category using the button above.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border divide-y overflow-hidden">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center gap-3 px-4 py-3 bg-background hover:bg-muted/50 transition-colors"
          >
            <span className="text-xl w-8 text-center shrink-0">
              {cat.icon ?? "📁"}
            </span>
            <span className="text-sm font-medium flex-1 truncate">
              {cat.name}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setDeletingCategory(cat)}
              aria-label={`Delete ${cat.name}`}
              className="shrink-0 text-destructive hover:text-destructive"
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>

      {deletingCategory && (
        <DeleteConfirmDialog
          open={!!deletingCategory}
          onOpenChange={(o) => {
            if (!o) setDeletingCategory(null);
          }}
          category={deletingCategory}
        />
      )}
    </>
  );
}
