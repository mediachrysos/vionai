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

const quickAmounts = [100, 200, 300, 500, 700];

export default function PaymentFormModal({ open, onClose, onSave, onAddNewCustomer, customers: customersProp = [], models, users, currentUser, existingPayment }) {
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
  const customers = fetchedCustomers.length > 0 ? fetchedCustomers : customersProp;
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

  const filteredCustomers = customerSearch
    ? customers.filter((c) =>
        c.full_name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.email?.toLowerCase().includes(customerSearch.toLowerCase())
      )
    : customers;

  const selectCustomer = (c) => {
    const modelMatch = models.find((m) => m.id === c.assigned_model);
    setForm((prev) => ({
      ...prev,
      customer_id: c.id,
      customer_name: c.full_name,
      model_id: c.assigned_model || prev.model_id,
      model_name: modelMatch?.name || prev.model_name,
      chatter_email: c.assigned_chatter || prev.chatter_email
    }));
    setCustomerSearch(c.full_name);
    setShowCustomerDropdown(false);
  };

  const handleModelChange = (modelId) => {
    const m = models.find((x) => x.id === modelId);
    setForm((prev) => ({ ...prev, model_id: modelId, model_name: m?.name || "" }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    const data = { ...form, amount: parseFloat(form.amount) || 0, is_payout: mode === "payout" };
    await onSave(data);
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        <div className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] px-6 py-5 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{existingPayment ? "Upravit platbu" : "Přidat platbu"}</h2>
              <p className="text-amber-100 text-xs">{existingPayment ? "Upravte údaje platby" : "Zaznamenejte novou příchozí platbu"}</p>
            </div>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setMode("payment")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${mode === "payment" ? "text-[#C9A227] border-b-2 border-[#C9A227]" : "text-gray-400 hover:text-gray-600"}`}
          >
            <CreditCard className="w-4 h-4" /> Příjem
          </button>
          <button
            onClick={() => setMode("payout")}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${mode === "payout" ? "text-[#C9A227] border-b-2 border-[#C9A227]" : "text-gray-400 hover:text-gray-600"}`}
          >
            <Wallet className="w-4 h-4" /> Výplata
          </button>
        </div>

        <div className="space-y-4 p-6">
          {/* Customer Search — only for payment mode */}
          {mode === "payout" && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
              Výplata bude zapsána do historie transakcí, ale nebude se počítat jako příjem ani výdaj.
            </div>
          )}
          {mode === "payment" && (
          <div className="relative">
            <Label>Zákazník *</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                ref={searchRef}
                value={customerSearch}
                onChange={(e) => {setCustomerSearch(e.target.value);setShowCustomerDropdown(true);}}
                onFocus={() => setShowCustomerDropdown(true)}
                placeholder="Hledat zákazníka podle jména nebo emailu..."
                className="pl-10" />
            </div>
            {showCustomerDropdown &&
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredCustomers.map((c) =>
              <button
                key={c.id}
                onClick={() => selectCustomer(c)}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-amber-50 flex items-center justify-center text-xs font-semibold text-[#C9A227]">
                      {c.full_name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-700">{c.full_name}</p>
                      <p className="text-xs text-slate-400">{c.email || "Bez emailu"}</p>
                    </div>
                  </button>
              )}
                {filteredCustomers.length === 0 &&
              <button
                onClick={() => {onAddNewCustomer && onAddNewCustomer(customerSearch);setShowCustomerDropdown(false);}}
                className="w-full text-left px-4 py-2.5 hover:bg-amber-50 text-sm flex items-center gap-3 text-[#C9A227] border-t border-gray-100">
                    <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center">
                       <UserPlus className="w-3.5 h-3.5 text-[#C9A227]" />
                    </div>
                    <div>
                      <p className="font-medium">Přidat nového zákazníka</p>
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
              <Label>Popis výplaty</Label>
              <Input
                value={form.note}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="např. Výplata Luky – duben 2026"
                className="mt-1"
              />
            </div>
          )}

          {/* Quick Amount */}
          <div>
            <Label>Částka *</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {quickAmounts.map((a) =>
              <button
                key={a}
                onClick={() => setForm((prev) => ({ ...prev, amount: a.toString() }))}
                className={cn(
                  "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                  parseFloat(form.amount) === a ?
                  "bg-gradient-to-r from-[#C9A227] to-[#A8841C] text-white border-[#C9A227]" :
                  "bg-white text-gray-600 border-gray-200 hover:border-[#C9A227]"
                )}>
                
                  {a.toLocaleString()} Kč
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="Vlastní částka" />
              <Select value={form.model_id} onValueChange={handleModelChange}>
                <SelectTrigger><SelectValue placeholder="Vybrat modelku" /></SelectTrigger>
                <SelectContent>
                  {models.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cílový účet</Label>
            <Select value={form.bank_account_id} onValueChange={(v) => {
              const acc = bankAccounts.find((a) => a.id === v);
              setForm((prev) => ({ ...prev, bank_account_id: v, account_name: acc?.name || "" }));
            }}>
              <SelectTrigger><SelectValue placeholder="Vybrat účet" /></SelectTrigger>
              <SelectContent>
                {bankAccounts.map((a) =>
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                )}
              </SelectContent>
            </Select>
            </div>
            <div>
              <Label>Datum platby</Label>
              <DatePicker value={form.payment_date} onChange={(v) => setForm((prev) => ({ ...prev, payment_date: v }))} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={onClose} disabled={saving}>Zrušit</Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || (mode === "payment" && !form.customer_id) || !form.amount}
              className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] text-white hover:from-[#A8841C] hover:to-[#8a6c16]"
            >
              {saving ? "Ukládám..." : existingPayment ? "Uložit změny" : "Přidat platbu"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>);

}