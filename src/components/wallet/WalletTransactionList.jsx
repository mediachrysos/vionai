import React, { useState, useMemo, useRef, useEffect } from "react";
import { format } from "date-fns";
import { ArrowUpCircle, ArrowDownCircle, FileText, ChevronLeft, ChevronRight, Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MONTH_NAMES = [
  "Leden","Únor","Březen","Duben","Květen","Červen",
  "Červenec","Srpen","Září","Říjen","Listopad","Prosinec"
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function MonthDayPicker({ year, month, selectedDay, onSelectDay, onClose }) {
  const days = getDaysInMonth(year, month);
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const offset = firstDow === 0 ? 6 : firstDow - 1; // Mon-first
  return (
    <div className="absolute z-50 top-full left-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 p-3 w-56">
      <div className="text-xs font-semibold text-gray-600 mb-2 text-center">{MONTH_NAMES[month]} {year}</div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {["Po","Út","St","Čt","Pá","So","Ne"].map(d => (
          <div key={d} className="text-[10px] text-gray-400 font-medium pb-1">{d}</div>
        ))}
        {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: days }, (_, i) => i + 1).map(d => (
          <button
            key={d}
            onClick={() => { onSelectDay(selectedDay === d ? null : d); onClose(); }}
            className={`text-xs w-7 h-7 rounded-lg font-medium transition-colors ${
              selectedDay === d
                ? "bg-[#C9A227] text-white"
                : "hover:bg-amber-50 text-gray-700"
            }`}
          >
            {d}
          </button>
        ))}
      </div>
      {selectedDay && (
        <button onClick={() => { onSelectDay(null); onClose(); }} className="mt-2 w-full text-xs text-gray-400 hover:text-red-500 text-center">
          Zrušit filtr dne
        </button>
      )}
    </div>
  );
}

export default function WalletTransactionList({ transactions, typeFilter, onTypeFilterChange, onSelect, onDelete }) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const pickerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowDayPicker(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const prevMonth = () => {
    setSelectedDay(null);
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    setSelectedDay(null);
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
  const dayStr = selectedDay ? `${monthStr}-${String(selectedDay).padStart(2, "0")}` : null;

  const monthFiltered = useMemo(() =>
    transactions.filter(tx => {
      const d = tx.transaction_date || tx.created_date?.split("T")[0] || "";
      return dayStr ? d === dayStr : d.startsWith(monthStr);
    }), [transactions, monthStr, dayStr]);

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
      {/* Month switcher + filters */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-1 relative" ref={pickerRef}>
          <button onClick={prevMonth} className="w-6 h-6 rounded hover:bg-gray-100 flex items-center justify-center">
            <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
          </button>
          <button
            onClick={() => setShowDayPicker(v => !v)}
            className={`text-xs font-semibold px-2 py-1 rounded-lg transition-colors min-w-[120px] text-center ${selectedDay ? "bg-amber-50 text-[#C9A227] border border-[#e8d99a]" : "text-gray-700 hover:bg-gray-100"}`}
          >
            {selectedDay ? `${selectedDay}. ${MONTH_NAMES[viewMonth]} ${viewYear}` : `${MONTH_NAMES[viewMonth]} ${viewYear}`}
          </button>
          <button onClick={nextMonth} className="w-6 h-6 rounded hover:bg-gray-100 flex items-center justify-center">
            <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
          </button>
          {selectedDay && (
            <button onClick={() => setSelectedDay(null)} className="w-5 h-5 rounded hover:bg-red-50 flex items-center justify-center">
              <X className="w-3 h-3 text-red-400" />
            </button>
          )}
          {showDayPicker && (
            <MonthDayPicker
              year={viewYear}
              month={viewMonth}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              onClose={() => setShowDayPicker(false)}
            />
          )}
        </div>

        {/* Type filter */}
        <div className="flex gap-0.5 bg-gray-50 rounded-lg p-0.5 border border-gray-200 ml-auto">
          {[["all", "Vše"], ["income", "Příjmy"], ["expense", "Výdaje"]].map(([val, label]) => (
            <button key={val} onClick={() => onTypeFilterChange(val)}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${typeFilter === val ? "bg-white shadow-sm text-gray-800 border border-gray-200" : "text-gray-400 hover:text-gray-600"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Category filter */}
        {categories.length > 0 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-7 text-xs w-36 border-gray-200">
              <Filter className="w-3 h-3 mr-1 text-gray-400" />
              <SelectValue placeholder="Kategorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechny kategorie</SelectItem>
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
          <div className="text-center py-10 text-sm text-gray-400">Žádné transakce v tomto měsíci</div>
        ) : filtered.map((tx, i) => {
          const isIncome = tx.type === "income";
          const isDeletable = !!onDelete;
          return (
            <div key={tx.id || i} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white border border-[#ececec] hover:border-[#e8d99a] transition-colors group">
              <div
                className={`flex items-center gap-3 min-w-0 flex-1 ${onSelect ? "cursor-pointer" : ""}`}
                onClick={() => onSelect?.(tx)}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isIncome ? "bg-emerald-50" : "bg-red-50"}`}>
                  {isIncome
                    ? <ArrowUpCircle className="w-4 h-4 text-emerald-600" />
                    : <ArrowDownCircle className="w-4 h-4 text-red-500" />
                  }
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-gray-800 truncate">{tx.title}</p>
                    {tx.invoice_url && (
                      <a href={tx.invoice_url} target="_blank" rel="noreferrer" title="Zobrazit fakturu" onClick={e => e.stopPropagation()}>
                        <FileText className="w-3.5 h-3.5 text-blue-400 hover:text-blue-600 flex-shrink-0" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <p className="text-xs text-gray-400">
                      {tx.transaction_date
                        ? format(new Date(tx.transaction_date), "d. M. yyyy")
                        : tx.created_date
                          ? format(new Date(tx.created_date), "d. M. yyyy")
                          : "—"}
                    </p>
                    {tx.category && <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0">{tx.category}</Badge>}
                    {tx.account_name && <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 bg-amber-50 border-amber-200 text-amber-700">{tx.account_name}</Badge>}
                    {tx.source && <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 bg-blue-50 border-blue-200 text-blue-700">{tx.source}</Badge>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <p className={`text-base font-bold ${isIncome ? "text-emerald-700" : "text-red-600"}`}>
                  {isIncome ? "+" : "–"}{(tx.amount || 0).toLocaleString("cs-CZ")} Kč
                </p>
                {isDeletable && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(tx); }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500"
                    title="Smazat transakci"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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