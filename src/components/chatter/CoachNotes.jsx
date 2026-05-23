import React, { useState, useMemo } from "react";
import { MessageSquare, Plus, X, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DatePicker from "@/components/ui-custom/DatePicker";

const SLIDES = ["customer", "datetime_amount", "account", "model"];
const slideLabel = { customer: "Klient", datetime_amount: "Datum & Částka", account: "Účet", model: "Modelka" };

const emptyForm = () => ({
  customer_name: "",
  note_date: new Date().toISOString().split("T")[0],
  amount: "",
  account: "",
  account_name: "",
  model_id: "",
  model_name: "",
  content: ""
});

export default function CoachNotes({ notes, chatterEmail, onAdd, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [slideIdx, setSlideIdx] = useState(0);
  const [noteIdx, setNoteIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const qc = useQueryClient();

  const { data: models = [] } = useQuery({ queryKey: ["models"], queryFn: () => base44.entities.Model.list(), staleTime: 120000 });
  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => base44.entities.Customer.list("-created_date", 500), staleTime: 60000 });
  const { data: bankAccounts = [] } = useQuery({ queryKey: ["bankAccounts"], queryFn: () => base44.entities.BankAccount.filter({ is_active: true }), staleTime: 60000 });

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 8);
    return customers.filter(c => c.full_name?.toLowerCase().includes(customerSearch.toLowerCase())).slice(0, 8);
  }, [customers, customerSearch]);

  const handleAdd = async () => {
    if (!form.content.trim()) return;
    setSaving(true);
    await onAdd(form.content.trim(), {
      customer_name: form.customer_name,
      note_date: form.note_date,
      amount: form.amount ? parseFloat(form.amount) : undefined,
      account: form.account,
      account_name: form.account_name,
      model_id: form.model_id,
      model_name: form.model_name,
    });
    setForm(emptyForm());
    setCustomerSearch("");
    setSlideIdx(0);
    setSaving(false);
    setShowForm(false);
    setNoteIdx(0);
  };

  const handleAccountChange = (id) => {
    if (id === "__manual__") { setForm(p => ({ ...p, account: "", account_name: "" })); return; }
    const acc = bankAccounts.find(a => a.id === id);
    setForm(p => ({ ...p, account: id, account_name: acc?.name || "" }));
  };

  const handleModelChange = (id) => {
    const m = models.find(m => m.id === id);
    setForm(p => ({ ...p, model_id: id, model_name: m?.name || "" }));
  };

  const safeIdx = Math.min(noteIdx, Math.max(0, notes.length - 1));
  const currentNote = notes[safeIdx];
  const currentSlide = SLIDES[slideIdx];

  return (
    <div className="bg-white rounded-xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] px-5 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-slate-50 rounded-xl w-9 h-9 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-[#C9A227]" />
          </div>
          <h3 className="text-sm font-semibold text-white">Moje poznámky</h3>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); setForm(emptyForm()); setCustomerSearch(""); setSlideIdx(0); }}
          className="h-7 w-7 flex items-center justify-center rounded-lg text-white hover:bg-white/20 transition-colors"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

      <div className="p-4 flex-1 overflow-hidden flex flex-col gap-3">
        {/* Form OR Notes — never both expanded */}
        {showForm ? (
          <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-100 space-y-3">
            {/* Note content */}
            <Textarea
              value={form.content}
              onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              placeholder="Napište poznámku..."
              rows={2}
              autoFocus
              className="text-sm resize-none"
            />

            {/* Slide fields */}
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setSlideIdx(i => (i - 1 + SLIDES.length) % SLIDES.length)}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-amber-100 text-amber-500 transition-colors flex-shrink-0">
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex-1 min-w-0">
                {/* Dots */}
                <div className="flex items-center justify-center gap-1 mb-2">
                  {SLIDES.map((_, i) => (
                    <button key={i} type="button" onClick={() => setSlideIdx(i)}
                      className={`h-1.5 rounded-full transition-all ${i === slideIdx ? "bg-amber-500 w-3" : "bg-amber-200 w-1.5"}`} />
                  ))}
                </div>
                <div className="text-[10px] text-amber-600/60 text-center font-medium uppercase tracking-wide mb-1.5">
                  {slideLabel[currentSlide]}
                </div>

                {currentSlide === "customer" && (
                  <div className="relative">
                    <Input value={customerSearch}
                      onChange={e => { setCustomerSearch(e.target.value); setForm(p => ({ ...p, customer_name: e.target.value })); setShowCustomerDropdown(true); }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 150)}
                      placeholder="Jméno klienta..." className="h-8 text-sm" />
                    {showCustomerDropdown && filteredCustomers.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-36 overflow-y-auto">
                        {filteredCustomers.map(c => (
                          <button key={c.id} type="button"
                            onMouseDown={() => { setForm(p => ({ ...p, customer_name: c.full_name })); setCustomerSearch(c.full_name); setShowCustomerDropdown(false); }}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 text-gray-700">{c.full_name}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {currentSlide === "datetime_amount" && (
                  <div className="grid grid-cols-2 gap-2">
                    <DatePicker value={form.note_date} onChange={v => setForm(p => ({ ...p, note_date: v }))} />
                    <Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                      placeholder="Částka (Kč)" className="h-8 text-sm" />
                  </div>
                )}

                {currentSlide === "account" && (
                  <div className="space-y-1.5">
                    <Select value={form.account || "__manual__"} onValueChange={handleAccountChange}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Vyberte účet" /></SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                        <SelectItem value="__manual__">— Zadat ručně —</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.account === "" && (
                      <Input value={form.account_name} onChange={e => setForm(p => ({ ...p, account_name: e.target.value }))}
                        placeholder="č. účtu nebo název" className="h-8 text-sm" />
                    )}
                  </div>
                )}

                {currentSlide === "model" && (
                  <Select value={form.model_id} onValueChange={handleModelChange}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Vyberte modelku" /></SelectTrigger>
                    <SelectContent>
                      {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <button type="button" onClick={() => setSlideIdx(i => (i + 1) % SLIDES.length)}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-amber-100 text-amber-500 transition-colors flex-shrink-0">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => { setShowForm(false); setForm(emptyForm()); setCustomerSearch(""); }}
                className="h-8 px-3 text-xs rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">Zrušit</button>
              <button onClick={handleAdd} disabled={!form.content.trim() || saving}
                className="h-8 px-4 text-xs rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-colors disabled:opacity-50">
                {saving ? "Ukládám..." : "Přidat"}
              </button>
            </div>
          </div>
        ) : (
          /* Notes carousel */
          <div className="flex-1 flex flex-col min-h-0">
            {notes.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">Zatím žádné poznámky</p>
            ) : (
              <div className="flex flex-col gap-2 flex-1">
                {notes.length > 1 && (
                  <div className="flex items-center justify-between px-1">
                    <button onClick={() => setNoteIdx(i => Math.max(0, i - 1))} disabled={safeIdx === 0}
                      className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 transition-colors">
                      <ChevronLeft className="w-4 h-4 text-gray-500" />
                    </button>
                    <span className="text-[11px] text-gray-400 font-medium">{safeIdx + 1} / {notes.length}</span>
                    <button onClick={() => setNoteIdx(i => Math.min(notes.length - 1, i + 1))} disabled={safeIdx === notes.length - 1}
                      className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 transition-colors">
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                )}

                {currentNote && (() => {
                  const isToday = currentNote.note_date === today;
                  const accountLabel = currentNote.account_name || bankAccounts.find(a => a.id === currentNote.account)?.name || currentNote.account;
                  return (
                    <div className={`group relative rounded-2xl border p-4 flex-1 shadow-sm transition-all ${isToday ? "bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200" : "bg-white border-gray-100"}`}>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${isToday ? "bg-amber-200 text-amber-800" : "bg-gray-100 text-gray-500"}`}>
                            {currentNote.customer_name ? currentNote.customer_name.charAt(0).toUpperCase() : "📝"}
                          </div>
                          {currentNote.customer_name
                            ? <span className={`text-sm font-bold truncate ${isToday ? "text-amber-900" : "text-gray-800"}`}>{currentNote.customer_name}</span>
                            : <span className="text-xs text-gray-400 italic">Bez klienta</span>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isToday
                            ? <span className="text-[10px] font-bold tracking-wide text-white bg-amber-500 rounded-full px-2.5 py-0.5">DNES</span>
                            : currentNote.note_date
                              ? <span className="text-[11px] text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{format(new Date(currentNote.note_date), "d. MMM yyyy", { locale: cs })}</span>
                              : null}
                          <button onClick={() => { onDelete(currentNote.id); setNoteIdx(i => Math.max(0, i - 1)); }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {(currentNote.amount || accountLabel || currentNote.model_name) && (
                        <div className="flex flex-wrap gap-1.5 mb-2.5">
                          {currentNote.amount && (
                            <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                              {Number(currentNote.amount).toLocaleString("cs-CZ")} Kč
                            </span>
                          )}
                          {accountLabel && (
                            <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-sky-100 text-sky-700">
                              {accountLabel}
                            </span>
                          )}
                          {currentNote.model_name && (
                            <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">
                              {currentNote.model_name}
                            </span>
                          )}
                        </div>
                      )}

                      {currentNote.content && (
                        <p className={`text-xs leading-relaxed ${isToday ? "text-amber-800" : "text-gray-500"}`}>
                          {currentNote.content}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}