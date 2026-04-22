import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, X, CreditCard, Building2, Bot, ChevronLeft, ChevronRight } from "lucide-react";
import DatePicker from "@/components/ui-custom/DatePicker";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

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

// Slide fields (in order, after content)
const SLIDES = ["customer", "datetime_amount", "account", "model"];

const slideLabel = { customer: "Klient", datetime_amount: "Datum & Částka", account: "Účet", model: "Modelka" };

export default function TodayNotesWidget({ currentUser, paydayCustomers = [], models: paydayModels = [] }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [noteSearch, setNoteSearch] = useState("");
  const [slideIdx, setSlideIdx] = useState(0); // which extra field is showing
  const [noteIdx, setNoteIdx] = useState(0); // which note is showing in carousel

  const { data: notes = [] } = useQuery({
    queryKey: ["notes"],
    queryFn: () => base44.entities.Note.list("-created_date", 100)
  });
  const { data: models = [] } = useQuery({
    queryKey: ["models"],
    queryFn: () => base44.entities.Model.list()
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 500)
  });
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankAccounts"],
    queryFn: () => base44.entities.BankAccount.filter({ is_active: true })
  });

  const isAdmin = currentUser?.role === "admin";

  const myModelIds = useMemo(() => {
    if (!currentUser?.email || isAdmin) return null;
    return models.filter((m) => m.assigned_chatters?.includes(currentUser.email)).map((m) => m.id);
  }, [models, currentUser, isAdmin]);

  const visibleNotes = useMemo(() => {
    if (isAdmin) return notes;
    return notes.filter((n) => {
      if (!n.model_id) return n.author_email === currentUser?.email;
      return myModelIds?.includes(n.model_id);
    });
  }, [notes, isAdmin, myModelIds, currentUser]);

  const sortedNotes = useMemo(() => {
    const filtered = noteSearch
      ? visibleNotes.filter(n =>
          n.customer_name?.toLowerCase().includes(noteSearch.toLowerCase()) ||
          n.model_name?.toLowerCase().includes(noteSearch.toLowerCase()) ||
          n.content?.toLowerCase().includes(noteSearch.toLowerCase())
        )
      : visibleNotes;
    return [...filtered].sort((a, b) => {
      const aToday = a.note_date === today;
      const bToday = b.note_date === today;
      if (aToday && !bToday) return -1;
      if (!aToday && bToday) return 1;
      return new Date(b.created_date) - new Date(a.created_date);
    });
  }, [visibleNotes, today, noteSearch]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 8);
    return customers.filter((c) =>
      c.full_name?.toLowerCase().includes(customerSearch.toLowerCase())
    ).slice(0, 8);
  }, [customers, customerSearch]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Note.create({
      ...data,
      amount: data.amount ? parseFloat(data.amount) : undefined,
      author_email: currentUser?.email,
      author_name: currentUser?.full_name
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      setShowForm(false);
      setForm(emptyForm());
      setCustomerSearch("");
      setSlideIdx(0);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Note.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] })
  });

  const handleModelChange = (id) => {
    const m = models.find((m) => m.id === id);
    setForm((p) => ({ ...p, model_id: id, model_name: m?.name || "" }));
  };

  const handleAccountChange = (id) => {
    if (id === "__manual__") {
      setForm((p) => ({ ...p, account: "", account_name: "" }));
      return;
    }
    const acc = bankAccounts.find((a) => a.id === id);
    setForm((p) => ({ ...p, account: id, account_name: acc?.name || "" }));
  };

  const selectCustomer = (name) => {
    setForm((p) => ({ ...p, customer_name: name }));
    setCustomerSearch(name);
    setShowCustomerDropdown(false);
  };

  const prevSlide = () => setSlideIdx(i => (i - 1 + SLIDES.length) % SLIDES.length);
  const nextSlide = () => setSlideIdx(i => (i + 1) % SLIDES.length);

  const prevNote = () => setNoteIdx(i => Math.max(0, i - 1));
  const nextNote = () => setNoteIdx(i => Math.min(sortedNotes.length - 1, i + 1));

  const currentSlide = SLIDES[slideIdx];

  return (
    <div className="bg-white rounded-xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] px-5 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="bg-slate-50 rounded-xl w-9 h-9 flex items-center justify-center">
            <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774266695/Chrysos_icon_5_sljjsp.png" alt="" className="w-6 h-6 object-contain" />
          </div>
          <h3 className="text-sm font-semibold text-white">Poznámky</h3>
        </div>
        <div className="flex items-center gap-1">
          <div className="relative">
            <input
              value={noteSearch}
              onChange={e => setNoteSearch(e.target.value)}
              placeholder="Hledat..."
              className="h-7 w-28 bg-white/20 text-white text-xs placeholder-white/60 rounded-lg px-2.5 outline-none focus:bg-white/30 transition-colors"
            />
            {noteSearch && (
              <button onClick={() => setNoteSearch("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/70 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <Button size="sm" variant="ghost" onClick={() => { setShowForm((v) => !v); setCustomerSearch(""); setSlideIdx(0); }}
            className="h-7 w-7 p-0 rounded-lg text-white hover:bg-white/20">
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-hidden flex flex-col gap-3">
        {/* Form */}
        {showForm && (
          <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-100 space-y-3">
            {/* Main: just the note content */}
            <div>
              <Textarea
                value={form.content}
                onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                placeholder="Napište poznámku..."
                rows={2}
                className="text-sm resize-none"
                autoFocus
              />
            </div>

            {/* Slide extra fields */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={prevSlide}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-amber-100 text-amber-500 transition-colors flex-shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex-1 min-w-0">
                {/* Slide dots */}
                <div className="flex items-center justify-center gap-1 mb-2">
                  {SLIDES.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSlideIdx(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${i === slideIdx ? "bg-amber-500 w-3" : "bg-amber-200"}`}
                    />
                  ))}
                </div>

                <div className="text-[10px] text-amber-600/60 text-center font-medium uppercase tracking-wide mb-1.5">
                  {slideLabel[currentSlide]}
                </div>

                {/* Slide: Klient */}
                {currentSlide === "customer" && (
                  <div className="relative">
                    <Input
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setForm((p) => ({ ...p, customer_name: e.target.value }));
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 150)}
                      placeholder="Jméno klienta..."
                      className="h-8 text-sm"
                    />
                    {showCustomerDropdown && filteredCustomers.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-36 overflow-y-auto">
                        {filteredCustomers.map((c) => (
                          <button key={c.id} type="button" onMouseDown={() => selectCustomer(c.full_name)}
                            className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 text-gray-700">
                            {c.full_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Slide: Datum + Částka */}
                {currentSlide === "datetime_amount" && (
                  <div className="grid grid-cols-2 gap-2">
                    <DatePicker value={form.note_date} onChange={(v) => setForm((p) => ({ ...p, note_date: v }))} />
                    <Input type="number" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                      placeholder="Částka (Kč)" className="h-8 text-sm" />
                  </div>
                )}

                {/* Slide: Účet */}
                {currentSlide === "account" && (
                  <div className="space-y-1.5">
                    <Select value={form.account || "__manual__"} onValueChange={handleAccountChange}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Vyberte účet" /></SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                        <SelectItem value="__manual__">— Zadat ručně —</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.account === "" && (
                      <Input value={form.account_name} onChange={(e) => setForm((p) => ({ ...p, account_name: e.target.value }))}
                        placeholder="č. účtu nebo název" className="h-8 text-sm" />
                    )}
                  </div>
                )}

                {/* Slide: Modelka */}
                {currentSlide === "model" && (
                  <Select value={form.model_id} onValueChange={handleModelChange}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Vyberte modelku" /></SelectTrigger>
                    <SelectContent>
                      {models.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <button
                type="button"
                onClick={nextSlide}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-amber-100 text-amber-500 transition-colors flex-shrink-0"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setCustomerSearch(""); setSlideIdx(0); }} className="h-8 text-xs">Zrušit</Button>
              <Button size="sm" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}
                className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white">
                {createMutation.isPending ? "Ukládám..." : "Přidat"}
              </Button>
            </div>
          </div>
        )}

        {/* Payday strip */}
        {paydayCustomers.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex-shrink-0">
            <span className="text-sm">💰</span>
            <span className="text-xs font-semibold text-amber-800">Dnes výplata:</span>
            <div className="flex flex-wrap gap-1.5">
              {paydayCustomers.map((c) => (
                <span key={c.id} className="text-xs bg-amber-100 text-amber-800 border border-amber-200 rounded-full px-2 py-0.5 font-medium">
                  {c.full_name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes carousel — 1 note at a time */}
        <div className="flex-1 flex flex-col min-h-0">
          {sortedNotes.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">Zatím žádné poznámky</p>
          ) : (() => {
            const safeIdx = Math.min(noteIdx, sortedNotes.length - 1);
            const n = sortedNotes[safeIdx];
            const isToday = n.note_date === today;
            const accountLabel = n.account_name || bankAccounts.find((a) => a.id === n.account)?.name || n.account;
            return (
              <div className="flex flex-col gap-2 flex-1">
                {/* Navigation bar */}
                <div className="flex items-center justify-between px-1">
                  <button
                    onClick={prevNote}
                    disabled={safeIdx === 0}
                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-500" />
                  </button>
                  <span className="text-[11px] text-gray-400 font-medium">
                    {safeIdx + 1} / {sortedNotes.length}
                  </span>
                  <button
                    onClick={nextNote}
                    disabled={safeIdx === sortedNotes.length - 1}
                    className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                {/* Single note card */}
                <div
                  key={n.id}
                  className={`group relative rounded-2xl border p-4 transition-all shadow-sm flex-1 ${
                    isToday
                      ? "bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200"
                      : "bg-white border-gray-100"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                        isToday ? "bg-amber-200 text-amber-800" : "bg-gray-100 text-gray-500"}`}>
                        {n.customer_name ? n.customer_name.charAt(0).toUpperCase() : "?"}
                      </div>
                      {n.customer_name
                        ? <span className={`text-sm font-bold truncate ${isToday ? "text-amber-900" : "text-gray-800"}`}>{n.customer_name}</span>
                        : <span className="text-xs text-gray-400 italic">Bez klienta</span>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isToday
                        ? <span className="text-[10px] font-bold tracking-wide text-white bg-amber-500 rounded-full px-2.5 py-0.5">DNES</span>
                        : n.note_date
                          ? <span className="text-[11px] text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{format(new Date(n.note_date), "d. MMM yyyy", { locale: cs })}</span>
                          : null}
                      <button onClick={() => { deleteMutation.mutate(n.id); setNoteIdx(i => Math.max(0, i - 1)); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {(n.amount || accountLabel || n.model_name) && (
                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                      {n.amount && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                          {Number(n.amount).toLocaleString("cs-CZ")} Kč
                        </span>
                      )}
                      {accountLabel && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-sky-100 text-sky-700">
                          {accountLabel}
                        </span>
                      )}
                      {n.model_name && (
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                          n.model_name?.toLowerCase().includes("dominic") ? "bg-pink-100 text-pink-700" :
                          n.model_name?.toLowerCase().includes("laura") ? "bg-violet-100 text-violet-700" :
                          "bg-purple-100 text-purple-700"
                        }`}>
                          {n.model_name}
                        </span>
                      )}
                    </div>
                  )}

                  {n.content && (
                    <p className={`text-xs leading-relaxed pl-9 ${isToday ? "text-amber-800" : "text-gray-500"}`}>
                      {n.content}
                    </p>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}