import React, { useState, useMemo, useRef, useEffect } from "react";
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from "date-fns";
import { ArrowUpCircle, ArrowDownCircle, FileText, CalendarDays, ChevronDown, Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PRESETS = [
  { key: "last7",    label: "Last 7 days" },
  { key: "last30",   label: "Last 30 days" },
  { key: "last90",   label: "Last 90 days" },
  { key: "thisMonth",label: "This month" },
  { key: "thisYear", label: "This year" },
  { key: "all",      label: "All time" },
];

function getRange(preset) {
  const now = new Date();
  if (preset === "last7")    return { from: subDays(now, 6),         to: now };
  if (preset === "last30")   return { from: subDays(now, 29),        to: now };
  if (preset === "last90")   return { from: subDays(now, 89),        to: now };
  if (preset === "thisMonth")return { from: startOfMonth(now),       to: now };
  if (preset === "thisYear") return { from: startOfYear(now),        to: now };
  return null; // all
}

function formatRange(preset) {
  const r = getRange(preset);
  if (!r) return "All time";
  return `${format(r.from, "d. M. yyyy")} – ${format(r.to, "d. M. yyyy")}`;
}

export default function WalletTransactionList({ transactions, typeFilter, onTypeFilterChange, onSelect, onDelete }) {
  const [preset, setPreset] = useState("last30");
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const pickerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowPresetPicker(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const monthFiltered = useMemo(() => {
    const range = getRange(preset);
    return transactions.filter(tx => {
      if (!range) return true;
      const d = tx.transaction_date || tx.created_date?.split("T")[0] || "";
      if (!d) return false;
      const date = new Date(d);
      return date >= range.from && date <= range.to;
    });
  }, [transactions, preset]);

  const categories = useMemo(() => {
    const cats = new Set();
    monthFiltered.forEach(tx => { if (tx.category) cats.add(tx.category); });
    return Array.from(cats).sort();
  }, [monthFiltered]);

  const filtered = useMemo(() => {
    return monthFiltered.filter(tx => {
      const matchType = !typeFilter || typeFilter === "all" || tx.type === typeFilter;
      const matchCat = categoryFilter === "all" || tx.category === categoryFilter;
      return matchType && matchCat;
    });
  }, [monthFiltered, typeFilter, categoryFilter]);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {/* Date preset picker */}
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setShowPresetPicker(v => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20 transition-all"
          >
            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
            <span>{PRESETS.find(p => p.key === preset)?.label}</span>
            <span className="text-slate-500 text-[10px]">·</span>
            <span className="text-slate-500 text-[10px]">{formatRange(preset)}</span>
            <ChevronDown className="w-3 h-3 text-slate-500 ml-0.5" />
          </button>
          {showPresetPicker && (
            <div className="absolute z-50 top-full left-0 mt-1 bg-[#252525] border border-white/10 rounded-xl shadow-xl p-1 w-40">
              {PRESETS.map(p => (
                <button
                  key={p.key}
                  onClick={() => { setPreset(p.key); setShowPresetPicker(false); }}
                  className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors ${preset === p.key ? "bg-[#C9A227]/15 text-[#C9A227] font-semibold" : "text-slate-300 hover:bg-white/10"}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Type filter */}
        <div className="flex gap-0.5 bg-white/5 rounded-lg p-0.5 border border-white/10 ml-auto">
          {[["all", "All"], ["income", "Income"], ["expense", "Expenses"]].map(([val, label]) => (
            <button key={val} onClick={() => onTypeFilterChange(val)}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${typeFilter === val ? "bg-white/10 shadow-sm text-slate-200 border border-white/10" : "text-slate-500 hover:text-slate-300"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Category filter */}
        {categories.length > 0 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-7 text-xs w-36 border-gray-200">
              <Filter className="w-3 h-3 mr-1 text-gray-400" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* List */}
      <div className="space-y-2 max-h-[520px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-sm text-slate-500">No transactions this month</div>
        ) : filtered.map((tx, i) => {
          const isIncome = tx.type === "income";
          const isDeletable = !!onDelete;
          return (
            <div key={tx.id || i} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-[#C9A227]/30 transition-colors group">
              <div
                className={`flex items-center gap-3 min-w-0 flex-1 ${onSelect ? "cursor-pointer" : ""}`}
                onClick={() => onSelect?.(tx)}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isIncome ? "bg-emerald-950/50" : "bg-red-950/50"}`}>
                  {isIncome
                    ? <ArrowUpCircle className="w-4 h-4 text-emerald-600" />
                    : <ArrowDownCircle className="w-4 h-4 text-red-500" />
                  }
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-slate-200 truncate">{tx.title}</p>
                     {tx.invoice_url && (
                       <a href={tx.invoice_url} target="_blank" rel="noreferrer" title="View invoice" onClick={e => e.stopPropagation()}>
                         <FileText className="w-3.5 h-3.5 text-blue-400 hover:text-blue-300 flex-shrink-0" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <p className="text-xs text-slate-500">
                       {tx.transaction_date
                         ? format(new Date(tx.transaction_date), "d. M. yyyy")
                         : tx.created_date
                           ? format(new Date(tx.created_date), "d. M. yyyy")
                           : "—"}
                     </p>
                     {tx.category && <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 bg-white/5 border-white/10 text-slate-300">{tx.category}</Badge>}
                     {tx.account_name && <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 bg-amber-950/30 border-amber-700/30 text-amber-300">{tx.account_name}</Badge>}
                     {tx.source && <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 bg-blue-950/30 border-blue-700/30 text-blue-300">{tx.source}</Badge>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <p className={`text-base font-bold ${isIncome ? "text-emerald-400" : "text-red-400"}`}>
                   {isIncome ? "+" : "–"}{(tx.amount || 0).toLocaleString()}
                 </p>
                 {isDeletable && (
                   <button
                     onClick={(e) => { e.stopPropagation(); onDelete(tx); }}
                     className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-950/30 text-slate-500 hover:text-red-400"
                    title="Delete transaction"
                  >
                    <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774303157/Chrysos_icon_25_qzhwnb.png" alt="delete" className="w-3.5 h-3.5 object-contain" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}