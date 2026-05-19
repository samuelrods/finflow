"use client";

import { useState } from "react";
import { Transaction } from "@/lib/types";
import { TransactionTable } from "./transaction-table";
import { TransactionForm } from "./transaction-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeleteTransaction } from "@/hooks/use-transactions";
import { Skeleton } from "@/components/ui/skeleton";

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

export function TransactionDataTable({
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
      <div className="p-4 space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <>
      <TransactionTable
        data={transactions}
        onEdit={setEditingTransaction}
        onDelete={setDeletingTransaction}
      />
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
