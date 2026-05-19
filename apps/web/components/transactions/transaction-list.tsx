"use client";

import { useState } from "react";
import { Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { TransactionForm } from "./transaction-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { useDeleteTransaction } from "@/hooks/use-transactions";
import { Pencil, Trash2 } from "lucide-react";

function formatAmount(amount: string, type: "INCOME" | "EXPENSE"): string {
  const num = parseFloat(amount);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
  return type === "INCOME" ? `+${formatted}` : `-${formatted}`;
}

function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(isoString));
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  transaction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction;
}) {
  const deleteMutation = useDeleteTransaction();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete Transaction</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this transaction? This action cannot
            be undone.
          </DialogDescription>
        </DialogHeader>
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
            onClick={async () => {
              await deleteMutation.mutateAsync(transaction.id);
              onOpenChange(false);
            }}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TransactionList({
  transactions,
  isLoading,
}: {
  transactions: Transaction[];
  isLoading: boolean;
}) {
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] =
    useState<Transaction | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 rounded-none bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground text-sm">No transactions yet.</p>
        <p className="text-muted-foreground text-xs mt-1">
          Add your first transaction using the button above.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y">
        {transactions.map((t) => (
          <div
            key={t.id}
            className="flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-2 px-4 py-3 bg-background hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0 w-full sm:w-auto">
              <div className="flex items-center justify-center size-9 rounded-none border bg-muted shrink-0">
                <CategoryIcon name={t.category.icon} className="size-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {t.category.name}
                  </span>
                  <Badge variant={t.type === "INCOME" ? "income" : "expense"}>
                    {t.type === "INCOME" ? "Income" : "Expense"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {t.description && (
                    <span className="text-xs text-muted-foreground truncate">
                      {t.description}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDate(t.date)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between w-full sm:w-auto pl-11 sm:pl-0 shrink-0">
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums shrink-0",
                  t.type === "EXPENSE" ? "text-destructive" : "text-income"
                )}
              >
                {formatAmount(t.amount, t.type)}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setEditingTransaction(t)}
                  aria-label="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDeletingTransaction(t)}
                  aria-label="Delete"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {editingTransaction && (
        <TransactionForm
          open={!!editingTransaction}
          onOpenChange={(o) => {
            if (!o) setEditingTransaction(null);
          }}
          transaction={editingTransaction}
        />
      )}
      {deletingTransaction && (
        <DeleteConfirmDialog
          open={!!deletingTransaction}
          onOpenChange={(o) => {
            if (!o) setDeletingTransaction(null);
          }}
          transaction={deletingTransaction}
        />
      )}
    </>
  );
}
