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
import WalletTransactionDetailModal from "@/components/wallet/WalletTransactionDetailModal";

export default function Wallet() {
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
    queryFn: () => base44.entities.WalletTransaction.list("-transaction_date", 200)
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list("-payment_date", 500)
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-expense_date", 500)
  });

  // Build unified transaction list
  const allTransactions = useMemo(() => {
    const paymentTxs = payments.
    filter((p) => p.status !== "failed" && p.status !== "refunded").
    map((p) => {
      const acc = p.bank_account_id ? accounts.find((a) => a.id === p.bank_account_id) : null;
      return {
        id: "pay_" + p.id,
        title: p.customer_name ? `Platba – ${p.customer_name}` : "Platba zákazníka",
        amount: p.amount || 0,
        type: "income",
        transaction_date: p.payment_date,
        created_date: p.created_date,
        category: p.service_type || "Platba",
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
      category: e.category || "Výdaj",
      source: "Finance"
    }));

    const manualTxs = walletTxs.map((t) => ({ ...t, source: "Wallet" }));

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
        // Reverse balance update
        if (tx.account_id) {
          const acc = accounts.find((a) => a.id === tx.account_id);
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
      // Update BankAccount balance
      if (data.account_id) {
        const acc = accounts.find((a) => a.id === data.account_id);
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

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9A227] to-[#A8841C] flex items-center justify-center shadow-sm shadow-amber-200">
            <WalletIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>
            <p className="text-sm text-gray-400">Přehled financí a výplat</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => {setEditingAccount(null);setShowAccountModal(true);}}>
            <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774300825/Chrysos_icon_21_qx0oko.png" alt="" className="w-4 h-4 mr-1 object-contain" /> Nový účet
          </Button>
          <Button size="sm" onClick={() => setShowTxModal(true)}
          className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white">
            <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774300825/Chrysos_icon_21_qx0oko.png" alt="" className="w-4 h-4 mr-1 object-contain" /> Přidat transakci
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] p-5">
          <div className="flex items-center gap-2 mb-1">
            
            <p className="text-xs text-gray-400 uppercase tracking-wider">Celkové příjmy</p>
          </div>
          <p className="text-2xl font-bold text-emerald-700">{totalIncome.toLocaleString("cs-CZ")} Kč</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] p-5">
          <div className="flex items-center gap-2 mb-1">
            
            <p className="text-xs text-gray-400 uppercase tracking-wider">Celkové výdaje</p>
          </div>
          <p className="text-2xl font-bold text-red-600">{totalExpenses.toLocaleString("cs-CZ")} Kč</p>
        </div>
        <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] p-5">
          <div className="flex items-center gap-2 mb-1">
            
            <p className="text-xs text-gray-400 uppercase tracking-wider">Čistý zisk</p>
          </div>
          <p className={`text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? "text-[#C9A227]" : "text-red-600"}`}>
            {(totalIncome - totalExpenses).toLocaleString("cs-CZ")} Kč
          </p>
        </div>
      </div>

      {/* Accounts */}
      {accounts.length > 0 &&
      <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Firemní účty</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc) =>
          <WalletAccountCard
            key={acc.id}
            account={acc}
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

        {/* Transactions - full width */}
        <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">Historie transakcí</h3>
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
        accounts={accounts} />
      
      <WalletTransactionDetailModal
        open={!!selectedTx}
        onClose={() => setSelectedTx(null)}
        transaction={selectedTx}
        accounts={accounts}
        onUpdate={() => {
          qc.invalidateQueries({ queryKey: ["walletTransactions"] });
          setSelectedTx(null);
        }} />
      
    </div>);

}