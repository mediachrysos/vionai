import React, { useState, useMemo } from "react";
import { format } from "date-fns";
import { ArrowUpCircle, ArrowDownCircle, FileText, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MONTH_NAMES = [
  "Leden","Únor","Březen","Duben","Květen","Červen",
  "Červenec","Srpen","Září","Říjen","Listopad","Prosinec"
];

export default function WalletTransactionList({ transactions, typeFilter, onTypeFilterChange }) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [categoryFilter, setCategoryFilter] = useState("all");

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;

  const monthFiltered = useMemo(() =>
    transactions.filter(tx => {
      const d = tx.transaction_date || tx.created_date?.split("T")[0] || "";
      return d.startsWith(monthStr);
    }), [transactions, monthStr]);

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
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="w-6 h-6 rounded hover:bg-gray-100 flex items-center justify-center">
            <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
          </button>
          <span className="text-xs font-semibold text-gray-700 min-w-[100px] text-center">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button onClick={nextMonth} className="w-6 h-6 rounded hover:bg-gray-100 flex items-center justify-center">
            <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
          </button>
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
      <div className="space-y-2 max-h-[440px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-sm text-gray-400">Žádné transakce v tomto měsíci</div>
        ) : filtered.map((tx, i) => {
          const isIncome = tx.type === "income";
          return (
            <div key={tx.id || i} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white border border-[#ececec] hover:border-[#e8d99a] transition-colors">
              <div className="flex items-center gap-3 min-w-0">
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
                      <a href={tx.invoice_url} target="_blank" rel="noreferrer" title="Zobrazit fakturu">
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
              <p className={`text-base font-bold flex-shrink-0 ml-3 ${isIncome ? "text-emerald-700" : "text-red-600"}`}>
                {isIncome ? "+" : "–"}{(tx.amount || 0).toLocaleString("cs-CZ")} Kč
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}