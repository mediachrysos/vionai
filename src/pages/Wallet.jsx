import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Wallet as WalletIcon, TrendingUp, TrendingDown } from "lucide-react";

import WalletAccountCard from "@/components/wallet/WalletAccountCard";
import WalletAccountModal from "@/components/wallet/WalletAccountModal";
import WalletTransactionModal from "@/components/wallet/WalletTransactionModal";
import WaterfallCard from "@/components/wallet/WaterfallCard";
import WalletTransactionList from "@/components/wallet/WalletTransactionList";
import AccountBreakdownSection from "@/components/wallet/AccountBreakdownSection";
import WalletTransactionDetailModal from "@/components/wallet/WalletTransactionDetailModal";
import SubscriptionsSection from "@/components/wallet/SubscriptionsSection";
import { useWorkspace } from "@/lib/WorkspaceContext";

export default function Wallet() {
  const { currency } = useWorkspace();
  const qc = useQueryClient();
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [showTxModal, setShowTxModal] = useState(false);
  const [txFilter, setTxFilter] = useState("all");
  const [selectedTx, setSelectedTx] = useState(null);

  const { data: accounts = [] } = useQuery({
    queryKey: ["bankAccounts"],
    queryFn: () => base44.entities.BankAccount.filter({ is_active: true })
  });

  const { data: walletTxs = [] } = useQuery({
    queryKey: ["walletTransactions"],
    queryFn: () => base44.entities.WalletTransaction.list("-transaction_date", 5000)
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list("-payment_date", 5000)
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-expense_date", 5000)
  });

  // Build unified transaction list
  const allTransactions = useMemo(() => {
    const paymentTxs = payments.
    filter((p) => p.status !== "failed" && p.status !== "refunded").
    map((p) => {
      const acc = p.bank_account_id ? accounts.find((a) => a.id === p.bank_account_id) : null;
      return {
        id: "pay_" + p.id,
        title: p.customer_name ? `Payment – ${p.customer_name}` : "Customer payment",
        amount: p.amount || 0,
        type: "income",
        transaction_date: p.payment_date,
        created_date: p.created_date,
        category: p.service_type || "Payment",
        account_name: acc?.name || (p.destination_account ? p.destination_account : null),
        source: "Finance"
      };
    });

    const expenseTxs = expenses.map((e) => ({
      id: "exp_" + e.id,
      title: e.title,
      amount: e.amount || 0,
      type: "expense",
      transaction_date: e.expense_date,
      created_date: e.created_date,
      category: e.category || "Expense",
      source: "Finance"
    }));

    const manualTxs = walletTxs.map((t) => ({
      ...t,
      source: "Wallet",
      // transfers, "Výplata Majitelé" and "Firemní rezerva" categories are neutral — don't count as income/expense
      type: t.type === "transfer" ? "transfer" : (t.category === "Výplata Majitelé" || t.category === "Firemní rezerva") ? "neutral" : t.type
    }));

    return [...paymentTxs, ...expenseTxs, ...manualTxs].sort((a, b) => {
      const da = a.transaction_date || a.created_date?.split("T")[0] || "";
      const db = b.transaction_date || b.created_date?.split("T")[0] || "";
      return db.localeCompare(da);
    });
  }, [payments, expenses, walletTxs]);

  const totalIncome = useMemo(() =>
  allTransactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
  [allTransactions]);

  const totalExpenses = useMemo(() =>
  allTransactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
  [allTransactions]);
  // Note: "transfer" and "neutral" (Výplata category) are intentionally excluded from both totals

  const filteredTransactions = useMemo(() => {
    if (txFilter === "all") return allTransactions;
    return allTransactions.filter((t) => t.type === txFilter);
  }, [allTransactions, txFilter]);

  // Account mutations (editing existing BankAccounts - balance update)
  const saveAccountMutation = useMutation({
    mutationFn: async (data) => {
      if (editingAccount) return base44.entities.BankAccount.update(editingAccount.id, data);
      return base44.entities.BankAccount.create(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bankAccounts"] });
      setShowAccountModal(false);
      setEditingAccount(null);
    }
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (acc) => base44.entities.BankAccount.delete(acc.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bankAccounts"] })
  });

  const deleteTxMutation = useMutation({
    mutationFn: async (tx) => {
      if (tx.source === "Wallet") {
        await base44.entities.WalletTransaction.delete(tx.id);
        // Reverse balance update — always fetch fresh to avoid stale cache race condition
        if (tx.account_id) {
          const fresh = await base44.entities.BankAccount.filter({ id: tx.account_id });
          const acc = fresh[0];
          if (acc) {
            const delta = tx.type === "income" ? -tx.amount : tx.amount;
            await base44.entities.BankAccount.update(tx.account_id, { balance: (acc.balance || 0) + delta });
          }
        }
      } else if (tx.id?.startsWith("pay_")) {
        await base44.entities.Payment.delete(tx.id.replace("pay_", ""));
      } else if (tx.id?.startsWith("exp_")) {
        await base44.entities.Expense.delete(tx.id.replace("exp_", ""));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["walletTransactions"] });
      qc.invalidateQueries({ queryKey: ["bankAccounts"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
    }
  });

  // Transaction mutation
  const saveTxMutation = useMutation({
    mutationFn: async (data) => {
      const tx = await base44.entities.WalletTransaction.create(data);
      // Update BankAccount balance — always fetch fresh to avoid stale cache race condition
      if (data.account_id) {
        const fresh = await base44.entities.BankAccount.filter({ id: data.account_id });
        const acc = fresh[0];
        if (acc) {
          const delta = data.type === "income" ? data.amount : -data.amount;
          await base44.entities.BankAccount.update(data.account_id, { balance: (acc.balance || 0) + delta });
        }
      }
      return tx;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["walletTransactions"] });
      qc.invalidateQueries({ queryKey: ["bankAccounts"] });
      setShowTxModal(false);
    }
  });

  // Transfer between accounts — only updates balances, no income/expense record
  const transferMutation = useMutation({
    mutationFn: async ({ from_account_id, to_account_id, amount, transaction_date, note }) => {
      const freshAccounts = await base44.entities.BankAccount.filter({ is_active: true });
      const fromAcc = freshAccounts.find((a) => a.id === from_account_id);
      const toAcc = freshAccounts.find((a) => a.id === to_account_id);
      if (fromAcc) await base44.entities.BankAccount.update(from_account_id, { balance: (fromAcc.balance || 0) - amount });
      if (toAcc) await base44.entities.BankAccount.update(to_account_id, { balance: (toAcc.balance || 0) + amount });
      // Record as a neutral wallet tx for history
      const fromName = fromAcc?.name || "?";
      const toName = toAcc?.name || "?";
      await base44.entities.WalletTransaction.create({
        title: `Transfer: ${fromName} → ${toName}`,
        amount,
        type: "transfer",
        category: "Account transfer",
        account_id: from_account_id,
        account_name: fromName,
        transaction_date,
        note
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["walletTransactions"] });
      qc.invalidateQueries({ queryKey: ["bankAccounts"] });
      setShowTxModal(false);
    }
  });

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          

          
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Wallet</h1>
            <p className="text-sm text-slate-500">Financial overview and payouts</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {setEditingAccount(null);setShowAccountModal(true);}}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20 hover:text-slate-100 transition-all"
          >
            <Plus className="w-4 h-4" /> New account
          </button>
          <button
            onClick={() => setShowTxModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[#1e1e1e] border border-[#C9A227]/60 text-[#C9A227] hover:bg-[#C9A227]/10 shadow-[0_0_12px_rgba(201,162,39,0.35)] hover:shadow-[0_0_18px_rgba(201,162,39,0.55)] transition-all"
          >
            <Plus className="w-4 h-4" /> Add transaction
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1e1e1e] rounded-2xl border border-white/10 shadow-[0_6px_20px_rgba(0,0,0,0.3)] p-5">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Total income</p>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{totalIncome.toLocaleString()} <span className="text-base font-medium text-slate-500">{currency}</span></p>
        </div>
        <div className="bg-[#1e1e1e] rounded-2xl border border-white/10 shadow-[0_6px_20px_rgba(0,0,0,0.3)] p-5">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Total expenses</p>
          </div>
          <p className="text-2xl font-bold text-red-400">{totalExpenses.toLocaleString()} <span className="text-base font-medium text-slate-500">{currency}</span></p>
        </div>
        <div className="bg-[#1e1e1e] rounded-2xl border border-white/10 shadow-[0_6px_20px_rgba(0,0,0,0.3)] p-5">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Net profit</p>
          </div>
          <p className={`text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? "text-[#C9A227]" : "text-red-600"}`}>
            {(totalIncome - totalExpenses).toLocaleString()} <span className="text-base font-medium text-slate-500">{currency}</span>
          </p>
        </div>
      </div>

      {/* Accounts */}
      {accounts.length > 0 &&
      <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Company accounts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc) =>
          <WalletAccountCard
            key={acc.id}
            account={acc}
            walletTxs={walletTxs}
            payments={payments}
            onEdit={(a) => {setEditingAccount(a);setShowAccountModal(true);}}
            onDelete={deleteAccountMutation.mutate} />

          )}
          </div>
        </div>
      }

      {/* Main content */}
      <div className="space-y-6">
        {/* Waterfall */}
        <WaterfallCard payments={payments} expenses={expenses} walletTxs={walletTxs} />

        {/* Subscriptions */}
        <SubscriptionsSection accounts={accounts} />

        {/* Per-account breakdown by day/week/month */}
        <AccountBreakdownSection accounts={accounts} payments={payments} walletTxs={walletTxs} />

        {/* Transactions - full width */}
        <div className="bg-[#1e1e1e] rounded-2xl border border-white/10 shadow-[0_6px_20px_rgba(0,0,0,0.3)] p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Transaction history</h3>
          <WalletTransactionList
            transactions={allTransactions}
            typeFilter={txFilter}
            onTypeFilterChange={setTxFilter}
            onSelect={setSelectedTx}
            onDelete={(tx) => deleteTxMutation.mutate(tx)} />
          
        </div>
      </div>

      {/* Modals */}
      <WalletAccountModal
        open={showAccountModal}
        onClose={() => {setShowAccountModal(false);setEditingAccount(null);}}
        onSave={saveAccountMutation.mutateAsync}
        account={editingAccount} />
      
      <WalletTransactionModal
        open={showTxModal}
        onClose={() => setShowTxModal(false)}
        onSave={saveTxMutation.mutateAsync}
        onTransfer={transferMutation.mutateAsync}
        accounts={accounts} />
      
      <WalletTransactionDetailModal
        open={!!selectedTx}
        onClose={() => setSelectedTx(null)}
        transaction={selectedTx}
        accounts={accounts}
        onUpdate={() => {
          qc.invalidateQueries({ queryKey: ["walletTransactions"] });
          qc.invalidateQueries({ queryKey: ["expenses"] });
          setSelectedTx(null);
        }}
        onDelete={() => {
          qc.invalidateQueries({ queryKey: ["walletTransactions"] });
          qc.invalidateQueries({ queryKey: ["expenses"] });
          setSelectedTx(null);
        }} />
      
    </div>);

}