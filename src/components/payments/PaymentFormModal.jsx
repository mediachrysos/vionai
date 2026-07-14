import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Search, UserPlus, CreditCard, Wallet } from "lucide-react";
import DatePicker from "@/components/ui-custom/DatePicker";
import { useQuery } from "@tanstack/react-query";

const quickAmounts = [100, 200, 300, 500, 700, 1000];

export default function PaymentFormModal({ open, onClose, onSave, onAddNewCustomer, customers: customersProp = [], models, users, currentUser, existingPayment }) {
  // Role detection first — used in queries below
  const currentRoles = currentUser?.roles?.length > 0 ? currentUser.roles : currentUser?.role ? [currentUser.role] : [];
  const isAdmin = currentRoles.includes("admin");

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankAccounts"],
    queryFn: () => base44.entities.BankAccount.filter({ is_active: true })
  });
  const { data: fetchedCustomers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 9999),
    enabled: open,
    staleTime: 30000,
  });
  const allCustomers = fetchedCustomers.length > 0 ? fetchedCustomers : customersProp;
  const { data: allPayments = [] } = useQuery({
    queryKey: ["payments-modal", currentUser?.email, isAdmin],
    queryFn: async () => {
      if (isAdmin) return base44.entities.Payment.list("-created_date", 5000);
      const res = await base44.functions.invoke("getChatterPayments", { chatter_email: currentUser?.email });
      return res.data?.payments || [];
    },
    enabled: open && !!currentUser?.email,
    staleTime: 30000,
  });

  // Chatters (non-admins) only see their own assigned models (source of truth: User.assigned_model_ids)
  // and the customers confirmed on them — either directly assigned, or with a past payment for one of their models.
  const chatterModelIds = (currentUser?.assigned_model_ids || (currentUser?.assigned_model ? [currentUser.assigned_model] : [])).filter((id) => id != null && id !== "");
  const models_ = isAdmin ? models : models.filter((m) => chatterModelIds.includes(m.id));
  const paidCustomerIds = React.useMemo(() =>
    new Set(allPayments.filter((p) => p.customer_id && (chatterModelIds.includes(p.model_id) || p.chatter_email === currentUser?.email)).map((p) => p.customer_id)),
    [allPayments, chatterModelIds, currentUser?.email]);
  const customers = isAdmin ? allCustomers : allCustomers.filter((c) =>
    c.assigned_chatter === currentUser?.email ||
    (Array.isArray(c.assigned_models) && c.assigned_models.some((mid) => chatterModelIds.includes(mid))) ||
    paidCustomerIds.has(c.id)
  );
  const [form, setForm] = useState({
    customer_id: "", customer_name: "", amount: "", service_type: "",
    model_id: "", model_name: "", chatter_email: "", chatter_name: "",
    bank_account_id: "", account_name: "", payment_date: new Date().toISOString().split("T")[0],
    note: "", status: "completed"
  });
  const [mode, setMode] = useState("payment"); // "payment" | "payout"
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const searchRef = useRef(null);
  const customerFieldRef = useRef(null);

  // Close the customer dropdown when clicking anywhere outside the search field/list
  useEffect(() => {
    if (!showCustomerDropdown) return;
    const handleClickOutside = (e) => {
      if (customerFieldRef.current && !customerFieldRef.current.contains(e.target)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCustomerDropdown]);

  useEffect(() => {
    if (open) {
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
        setForm((prev) => ({
          ...prev, customer_id: "", customer_name: "", amount: "",
          service_type: "", model_id: "", model_name: "",
          chatter_email: currentUser?.email || "", chatter_name: currentUser?.full_name || "",
          bank_account_id: "", account_name: "", payment_date: new Date().toISOString().split("T")[0],
          note: "", status: "completed"
        }));
        setCustomerSearch("");
      }
    }
  }, [open, currentUser, existingPayment]);

  // If the search text exactly matches the already-selected customer's name, show all customers
  // (user clicked into the field to change it, but hasn't typed yet)
  const selectedCustomer = customers.find(c => c.id === form.customer_id);
  const searchIsCurrentSelection = selectedCustomer && customerSearch === selectedCustomer.full_name;
  const filteredCustomers = customerSearch && !searchIsCurrentSelection
    ? customers.filter((c) =>
        c.full_name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.email?.toLowerCase().includes(customerSearch.toLowerCase())
      )
    : customers;

  const selectCustomer = (c) => {
    const matchedModelId = Array.isArray(c.assigned_models) ? c.assigned_models.find((mid) => models_.some((m) => m.id === mid)) : null;
    const modelMatch = models_.find((m) => m.id === matchedModelId);
    setForm((prev) => ({
      ...prev,
      customer_id: c.id,
      customer_name: c.full_name,
      model_id: matchedModelId || prev.model_id,
      model_name: modelMatch?.name || prev.model_name,
      // chatter_email stays as the logged-in user who is recording the payment —
      // never overwritten by the customer's assigned chatter.
      bank_account_id: modelMatch?.assigned_bank_account_ids?.length === 1 ? modelMatch.assigned_bank_account_ids[0] : prev.bank_account_id,
      account_name: modelMatch?.assigned_bank_account_ids?.length === 1
        ? bankAccounts.find((a) => a.id === modelMatch.assigned_bank_account_ids[0])?.name || prev.account_name
        : prev.account_name
    }));
    setCustomerSearch(c.full_name);
    setShowCustomerDropdown(false);
  };

  const handleModelChange = (modelId) => {
    const m = models_.find((x) => x.id === modelId);
    const allowedIds = m?.assigned_bank_account_ids || [];
    const singleAllowed = allowedIds.length === 1 ? bankAccounts.find((a) => a.id === allowedIds[0]) : null;
    setForm((prev) => ({
      ...prev,
      model_id: modelId,
      model_name: m?.name || "",
      bank_account_id: singleAllowed ? singleAllowed.id : "",
      account_name: singleAllowed ? singleAllowed.name : "",
    }));
  };

  const selectedModel = models_.find((m) => m.id === form.model_id);
  const allowedBankAccounts = selectedModel?.assigned_bank_account_ids?.length > 0
    ? bankAccounts.filter((a) => selectedModel.assigned_bank_account_ids.includes(a.id))
    : bankAccounts;

  const handleSubmit = async () => {
    setSaving(true);
    const data = { ...form, amount: parseFloat(form.amount) || 0, is_payout: mode === "payout" };
    await onSave(data);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-visible p-0">
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
          <button
            onClick={() => setMode("payment")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${mode === "payment" ? "text-[#C9A227] border-b-2 border-[#C9A227]" : "text-slate-400 hover:text-slate-200"}`}
          >
            <CreditCard className="w-4 h-4" /> Income
          </button>
          <button
            onClick={() => setMode("payout")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${mode === "payout" ? "text-[#C9A227] border-b-2 border-[#C9A227]" : "text-slate-400 hover:text-slate-200"}`}
          >
            <Wallet className="w-4 h-4" /> Payout
          </button>
        </div>

        <div className="space-y-4 p-6">
          {/* Customer Search — only for payment mode */}
          {mode === "payout" && (
            <div className="bg-amber-950/30 border border-amber-700/30 rounded-lg px-4 py-3 text-sm text-amber-300">
              Payout will be recorded in transaction history but won't count as income or expense.
            </div>
          )}
          {mode === "payment" && (
          <div className="relative" ref={customerFieldRef}>
            <Label>Customer *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                ref={searchRef}
                value={customerSearch}
                onChange={(e) => {setCustomerSearch(e.target.value);setShowCustomerDropdown(true);}}
                onFocus={() => setShowCustomerDropdown(true)}
                placeholder="Search customer by name or email..."
                className="pl-10" />
            </div>
            {showCustomerDropdown &&
            <div className="absolute z-50 w-full mt-1 bg-[#252525] border border-white/10 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredCustomers.map((c) =>
              <button
                key={c.id}
                onClick={() => selectCustomer(c)}
                className="w-full text-left px-4 py-2.5 hover:bg-white/5 text-sm flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-amber-900/30 flex items-center justify-center text-xs font-semibold text-[#C9A227]">
                      {c.full_name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">{c.full_name}</p>
                      <p className="text-xs text-slate-500">{c.email || "No email"}</p>
                    </div>
                  </button>
              )}
                {filteredCustomers.length === 0 &&
              <button
                onClick={() => {onAddNewCustomer && onAddNewCustomer(customerSearch);setShowCustomerDropdown(false);}}
                className="w-full text-left px-4 py-2.5 hover:bg-white/5 text-sm flex items-center gap-3 text-[#C9A227] border-t border-white/10">
                    <div className="w-7 h-7 rounded-full bg-amber-900/30 flex items-center justify-center">
                       <UserPlus className="w-3.5 h-3.5 text-[#C9A227]" />
                    </div>
                    <div>
                      <p className="font-medium">Add new customer</p>
                      <p className="text-xs text-amber-400">"{customerSearch}"</p>
                    </div>
                  </button>
              }
              </div>
            }
          </div>
          )}

          {/* Payout note */}
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

          {/* Quick Amount */}
          <div>
            <Label>Amount *</Label>
            <div className="grid grid-cols-6 gap-2 mb-2">
              {quickAmounts.map((a) =>
              <button
                key={a}
                onClick={() => setForm((prev) => ({ ...prev, amount: a.toString() }))}
                className={cn(
                  "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                  parseFloat(form.amount) === a ?
                  "bg-gradient-to-r from-[#C9A227] to-[#A8841C] text-white border-[#C9A227]" :
                  "bg-[#2a2a2a] text-slate-300 border-white/10 hover:border-[#C9A227]"
                )}>
                
                  {a.toLocaleString()}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="Custom amount" />
              <Select value={form.model_id} onValueChange={handleModelChange}>
                <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                <SelectContent>
                  {models_.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Content name */}
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Target account</Label>
            <Select
              value={form.bank_account_id}
              onValueChange={(v) => {
                const acc = bankAccounts.find((a) => a.id === v);
                setForm((prev) => ({ ...prev, bank_account_id: v, account_name: acc?.name || "" }));
              }}>
              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                {allowedBankAccounts.map((a) =>
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                )}
              </SelectContent>
            </Select>
            </div>
            <div>
              <Label>Payment date</Label>
              <DatePicker value={form.payment_date} onChange={(v) => setForm((prev) => ({ ...prev, payment_date: v }))} openUpward />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || (mode === "payment" && !form.customer_id) || !form.amount}
              className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] text-white hover:from-[#A8841C] hover:to-[#8a6c16]"
            >
              {saving ? "Saving..." : existingPayment ? "Save changes" : "Add payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>);

}