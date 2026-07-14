import React, { useState, useEffect, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Search, UserPlus, CreditCard, Wallet } from "lucide-react";
import DatePicker from "@/components/ui-custom/DatePicker";

const QUICK_AMOUNTS = [100, 200, 300, 500, 700, 1000];

const defaultForm = (currentUser) => ({
  customer_id: "",
  customer_name: "",
  amount: "",
  service_type: "",
  model_id: "",
  model_name: "",
  chatter_email: currentUser?.email || "",
  chatter_name: currentUser?.full_name || "",
  bank_account_id: "",
  account_name: "",
  payment_date: new Date().toISOString().split("T")[0],
  note: "",
  status: "completed",
});

export default function PaymentFormModal({
  open, onClose, onSave, onAddNewCustomer,
  customers: customersProp = [],
  models: modelsProp = [],
  bankAccounts: bankAccountsProp = [],
  currentUser,
  existingPayment,
}) {
  const isAdmin = (currentUser?.roles || (currentUser?.role ? [currentUser.role] : [])).includes("admin");
  const qc = useQueryClient();

  // Always fetch fresh — staleTime:0 ensures we never use a stale empty cache
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankAccounts"],
    queryFn: () => base44.entities.BankAccount.filter({ is_active: true }),
    staleTime: 0,
  });

  const { data: allModels = [] } = useQuery({
    queryKey: ["models"],
    queryFn: () => base44.entities.Model.list(),
    staleTime: 0,
  });

  // Chatter's assigned model IDs
  const chatterModelIds = useMemo(() => (
    (currentUser?.assigned_model_ids || []).filter(Boolean)
  ), [currentUser]);

  // Models visible to current user
  const visibleModels = useMemo(() => (
    isAdmin ? allModels : allModels.filter((m) => chatterModelIds.includes(m.id))
  ), [isAdmin, allModels, chatterModelIds]);

  // Customers visible to current user
  const visibleCustomers = useMemo(() => {
    if (isAdmin) return customersProp;
    return customersProp.filter((c) => {
      if (c.assigned_chatter === currentUser?.email) return true;
      const assigned = Array.isArray(c.assigned_models) ? c.assigned_models : [];
      return assigned.some((mid) => chatterModelIds.includes(mid));
    });
  }, [isAdmin, customersProp, currentUser, chatterModelIds]);

  const [form, setForm] = useState(defaultForm(currentUser));
  const [mode, setMode] = useState("payment");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const dropdownRef = useRef(null);

  // Reset form when modal opens + invalidate stale cache
  useEffect(() => {
    if (!open) return;
    qc.invalidateQueries({ queryKey: ["bankAccounts"] });
    qc.invalidateQueries({ queryKey: ["models"] });
    setMode("payment");
    if (existingPayment) {
      setForm({
        customer_id: existingPayment.customer_id || "",
        customer_name: existingPayment.customer_name || "",
        amount: existingPayment.amount?.toString() || "",
        service_type: existingPayment.service_type || "",
        model_id: existingPayment.model_id || "",
        model_name: existingPayment.model_name || "",
        chatter_email: existingPayment.chatter_email || "",
        chatter_name: existingPayment.chatter_name || "",
        bank_account_id: existingPayment.bank_account_id || "",
        account_name: existingPayment.account_name || "",
        payment_date: existingPayment.payment_date || new Date().toISOString().split("T")[0],
        note: existingPayment.note || "",
        status: existingPayment.status || "completed",
      });
      setCustomerSearch(existingPayment.customer_name || "");
    } else {
      setForm(defaultForm(currentUser));
      setCustomerSearch("");
    }
  }, [open]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown]);

  // Filtered customer list for search
  const selectedCustomer = visibleCustomers.find((c) => c.id === form.customer_id);
  const searchMatchesSelection = selectedCustomer && customerSearch === selectedCustomer.full_name;
  const filteredCustomers = customerSearch && !searchMatchesSelection
    ? visibleCustomers.filter((c) =>
        c.full_name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.email?.toLowerCase().includes(customerSearch.toLowerCase())
      )
    : visibleCustomers;

  const selectCustomer = (c) => {
    const matchedModelId = (Array.isArray(c.assigned_models) ? c.assigned_models : [])
      .find((mid) => visibleModels.some((m) => m.id === mid));
    const modelMatch = visibleModels.find((m) => m.id === matchedModelId);
    const autoAccountId = modelMatch?.assigned_bank_account_ids?.length === 1
      ? modelMatch.assigned_bank_account_ids[0] : "";
    const autoAccountName = autoAccountId
      ? bankAccounts.find((a) => a.id === autoAccountId)?.name || "" : "";
    setForm((prev) => ({
      ...prev,
      customer_id: c.id,
      customer_name: c.full_name,
      model_id: matchedModelId || prev.model_id,
      model_name: modelMatch?.name || prev.model_name,
      bank_account_id: autoAccountId || prev.bank_account_id,
      account_name: autoAccountName || prev.account_name,
    }));
    setCustomerSearch(c.full_name);
    setShowDropdown(false);
  };

  const handleModelChange = (modelId) => {
    const m = allModels.find((x) => x.id === modelId);
    const allowedIds = m?.assigned_bank_account_ids || [];
    const singleAcc = allowedIds.length === 1 ? bankAccounts.find((a) => a.id === allowedIds[0]) : null;
    setForm((prev) => ({
      ...prev,
      model_id: modelId,
      model_name: m?.name || "",
      bank_account_id: singleAcc ? singleAcc.id : "",
      account_name: singleAcc ? singleAcc.name : "",
    }));
  };

  // Bank accounts available for selection based on selected model
  const allowedBankAccounts = useMemo(() => {
    const selectedModel = allModels.find((m) => m.id === form.model_id);
    if (selectedModel?.assigned_bank_account_ids?.length > 0) {
      const filtered = bankAccounts.filter((a) => selectedModel.assigned_bank_account_ids.includes(a.id));
      if (filtered.length > 0) return filtered;
    }
    // No model restriction — show all active accounts
    return bankAccounts;
  }, [bankAccounts, allModels, form.model_id]);

  const handleSubmit = async () => {
    setSaving(true);
    await onSave({ ...form, amount: parseFloat(form.amount) || 0, is_payout: mode === "payout" });
    setSaving(false);
  };

  const canSubmit = !saving && !!form.amount && (mode === "payout" || !!form.customer_id);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-visible p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] px-6 py-5 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{existingPayment ? "Edit payment" : "Add payment"}</h2>
              <p className="text-amber-100 text-xs">{existingPayment ? "Edit payment details" : "Record new incoming payment"}</p>
            </div>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-white/10">
          {["payment", "payout"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                mode === m ? "text-[#C9A227] border-b-2 border-[#C9A227]" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {m === "payment" ? <><CreditCard className="w-4 h-4" /> Income</> : <><Wallet className="w-4 h-4" /> Payout</>}
            </button>
          ))}
        </div>

        <div className="space-y-4 p-6 overflow-y-auto">
          {/* Payout info banner */}
          {mode === "payout" && (
            <div className="bg-amber-950/30 border border-amber-700/30 rounded-lg px-4 py-3 text-sm text-amber-300">
              Payout will be recorded in transaction history but won't count as income or expense.
            </div>
          )}

          {/* Customer search (payment only) */}
          {mode === "payment" && (
            <div className="relative" ref={dropdownRef}>
              <Label>Customer *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={customerSearch}
                  onChange={(e) => { setCustomerSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search customer by name or email..."
                  className="pl-10"
                />
              </div>
              {showDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-[#252525] border border-white/10 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectCustomer(c)}
                      className="w-full text-left px-4 py-2.5 hover:bg-white/5 text-sm flex items-center gap-3"
                    >
                      <div className="w-7 h-7 rounded-full bg-amber-900/30 flex items-center justify-center text-xs font-semibold text-[#C9A227]">
                        {c.full_name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-200">{c.full_name}</p>
                        <p className="text-xs text-slate-500">{c.email || "No email"}</p>
                      </div>
                    </button>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <button
                      onClick={() => { onAddNewCustomer?.(customerSearch); setShowDropdown(false); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-white/5 text-sm flex items-center gap-3 text-[#C9A227] border-t border-white/10"
                    >
                      <div className="w-7 h-7 rounded-full bg-amber-900/30 flex items-center justify-center">
                        <UserPlus className="w-3.5 h-3.5 text-[#C9A227]" />
                      </div>
                      <div>
                        <p className="font-medium">Add new customer</p>
                        <p className="text-xs text-amber-400">"{customerSearch}"</p>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Payout description */}
          {mode === "payout" && (
            <div>
              <Label>Payout description</Label>
              <Input
                value={form.note}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="e.g. Payout Luky – April 2026"
                className="mt-1"
              />
            </div>
          )}

          {/* Amount + Model */}
          <div>
            <Label>Amount *</Label>
            <div className="grid grid-cols-6 gap-2 mb-2">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => setForm((prev) => ({ ...prev, amount: a.toString() }))}
                  className={cn(
                    "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                    parseFloat(form.amount) === a
                      ? "bg-gradient-to-r from-[#C9A227] to-[#A8841C] text-white border-[#C9A227]"
                      : "bg-[#2a2a2a] text-slate-300 border-white/10 hover:border-[#C9A227]"
                  )}
                >
                  {a.toLocaleString()}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="Custom amount"
              />
              <Select value={form.model_id} onValueChange={handleModelChange}>
                <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                <SelectContent>
                  {visibleModels.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Content sent */}
          {mode === "payment" && (
            <div>
              <Label>Content sent (optional)</Label>
              <Input
                value={form.service_type}
                onChange={(e) => setForm((prev) => ({ ...prev, service_type: e.target.value }))}
                placeholder="e.g. video pack 1, photo set 3..."
                className="mt-1"
              />
            </div>
          )}

          {/* Account + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Target account</Label>
              <Select
                value={form.bank_account_id}
                onValueChange={(v) => {
                  const acc = bankAccounts.find((a) => a.id === v);
                  setForm((prev) => ({ ...prev, bank_account_id: v, account_name: acc?.name || "" }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {allowedBankAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment date</Label>
              <DatePicker
                value={form.payment_date}
                onChange={(v) => setForm((prev) => ({ ...prev, payment_date: v }))}
                openUpward
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] text-white hover:from-[#A8841C] hover:to-[#8a6c16]"
            >
              {saving ? "Saving..." : existingPayment ? "Save changes" : "Add payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}