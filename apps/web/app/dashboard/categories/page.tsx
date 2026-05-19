"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { CategoryList } from "@/components/categories/category-list";
import { CategoryForm } from "@/components/categories/category-form";
import { useCategories } from "@/hooks/use-categories";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function CategoriesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const { data: categories = [], isLoading, error } = useCategories();

  const userCategories = categories.filter((c) => c.userId !== null);
  const defaultCategories = categories.filter((c) => c.userId === null);

  return (
    <div className="px-4 py-6 md:px-8 md:py-10 w-full space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Categories</h2>
        <Button onClick={() => setFormOpen(true)}>
          <Plus />
          New Category
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">
          Failed to load categories: {error.message}
        </p>
      )}

      {/* User-defined categories */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          My Categories
        </h3>
        <CategoryList categories={userCategories} isLoading={isLoading} />
      </div>

      {/* Default system categories */}
      {!isLoading && defaultCategories.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Default Categories
          </h3>
          <Card className="divide-y overflow-hidden py-0">
            {defaultCategories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center gap-3 px-4 py-3 bg-background"
              >
                <div className="flex items-center justify-center size-9 rounded-none border bg-muted shrink-0">
                  <CategoryIcon name={cat.icon} className="size-5 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium flex-1 truncate">
                  {cat.name}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  Default
                </span>
              </div>
            ))}
          </Card>
        </div>
      )}

      {!isLoading && (
        <p className="text-xs text-muted-foreground text-right">
          {userCategories.length} custom categor
          {userCategories.length !== 1 ? "ies" : "y"}
        </p>
      )}

      <CategoryForm open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
