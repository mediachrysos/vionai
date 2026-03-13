import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Check, X, Plus, Download } from "lucide-react";
import { getDaysInMonth } from "date-fns";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "Leden","Únor","Březen","Duben","Květen","Červen",
  "Červenec","Srpen","Září","Říjen","Listopad","Prosinec"
];

function fmt(n) {
  if (!n && n !== 0) return "—";
  return n.toLocaleString("en-US").replace(/,/g, " ") + "Kč";
}

function EditableCell({ value, onSave, canCreate = false, highlight = "" }) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");

  const start = () => {
    setInput(value > 0 ? value.toString() : "");
    setEditing(true);
  };

  const cancel = () => setEditing(false);

  const save = () => {
    const num = parseFloat(input);
    if (!isNaN(num)) onSave(num);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 justify-end">
        <input
          autoFocus
          type="number"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
          className="w-20 text-right text-xs border border-amber-400 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-400"
        />
        <button onClick={save} className="text-emerald-500 hover:text-emerald-700"><Check className="w-3 h-3" /></button>
        <button onClick={cancel} className="text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
      </div>
    );
  }

  return (
    <div
      className={cn("flex items-center justify-end gap-1 group cursor-pointer", highlight)}
      onClick={start}
    >
      {value > 0 ? (
        <span className="text-xs tabular-nums group-hover:text-[#C9A227] transition-colors">{fmt(value)}</span>
      ) : (
        <span className="text-gray-300 group-hover:text-[#C9A227] transition-colors">
          {canCreate ? <Plus className="w-3 h-3" /> : "—"}
        </span>
      )}
    </div>
  );
}

function SummaryRow({ label, totals, chatters, bg = "bg-gray-50", textClass = "text-xs font-bold" }) {
  return (
    <tr className={cn(bg, "border-b-2 border-gray-200")}>
      <td className={cn("px-3 py-2.5 sticky left-0 z-10", bg, textClass, "text-gray-700")}>{label}</td>
      {/* Global: Příjmy */}
      <td className={cn("px-3 py-2.5 text-right tabular-nums text-gray-800 bg-indigo-50/50", textClass)}>
        {fmt(totals.totalRevenue)}
      </td>
      {/* Global: Ad Spend */}
      <td className={cn("px-3 py-2.5 text-right tabular-nums text-rose-600 bg-rose-50/30", textClass)}>
        {fmt(totals.adSpend)}
      </td>
      {/* Global: Profit */}
      <td className={cn("px-3 py-2.5 text-right tabular-nums bg-emerald-50/40", textClass,
        totals.profit >= 0 ? "text-emerald-600" : "text-red-500"
      )}>
        {fmt(totals.profit)}
      </td>
      {/* Divider */}
      <td className="px-1 bg-gray-200 w-px"></td>
      {/* Per-chatter totals */}
      {chatters.map((c, ci) => (
        <React.Fragment key={c.email}>
          <td className={cn("px-3 py-2.5 text-right tabular-nums text-amber-600", textClass)}>
            {fmt(totals.chatterRevenues[ci]?.revenue || 0)}
          </td>
          <td className={cn("px-3 py-2.5 text-right tabular-nums text-rose-500", textClass)}>
            {fmt(totals.chatterRevenues[ci]?.adSpend || 0)}
          </td>
          <td className={cn("px-3 py-2.5 text-right tabular-nums", textClass,
            (totals.chatterRevenues[ci]?.profit || 0) >= 0 ? "text-emerald-600" : "text-red-500"
          )}>
            {fmt(totals.chatterRevenues[ci]?.profit || 0)}
          </td>
        </React.Fragment>
      ))}
    </tr>
  );
}

function exportCSV(rows, chatters, year, month) {
  const monthName = MONTH_NAMES[month];
  const headers = ["Datum", "Příjmy", "Ad Spend", "Profit", ...chatters.flatMap(c => [`${c.name} Příjmy`, `${c.name} Ad Spend`, `${c.name} Profit`])];
  const csvRows = rows
    .filter(r => r.totalRevenue > 0 || r.globalAdSpend > 0)
    .map(r => [
      r.dateStr, r.totalRevenue, r.globalAdSpend, r.globalProfit,
      ...r.chatterRevenues.flatMap(cr => [cr.revenue, cr.adSpend, cr.profit])
    ]);
  const totalRow = ["CELKEM",
    rows.reduce((s, r) => s + r.totalRevenue, 0),
    rows.reduce((s, r) => s + r.globalAdSpend, 0),
    rows.reduce((s, r) => s + r.globalProfit, 0),
    ...chatters.flatMap((c, ci) => [
      rows.reduce((s, r) => s + (r.chatterRevenues[ci]?.revenue || 0), 0),
      rows.reduce((s, r) => s + (r.chatterRevenues[ci]?.adSpend || 0), 0),
      rows.reduce((s, r) => s + (r.chatterRevenues[ci]?.profit || 0), 0),
    ])
  ];
  const csv = [headers, ...csvRows, totalRow].map(r => r.join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `finance_${year}_${String(month + 1).padStart(2, "0")}_${monthName}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

export default function FinanceSheetTable() {
  const qc = useQueryClient();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const monthStart = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
  const daysInMonth = getDaysInMonth(new Date(viewYear, viewMonth));
  const monthEnd = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;

  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list("-payment_date", 2000),
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-expense_date", 2000),
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({ id, amount }) => base44.entities.Payment.update(id, { amount }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payments"] }),
  });
  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, amount }) => base44.entities.Expense.update(id, { amount }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
  const createExpenseMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });

  const monthPayments = useMemo(() =>
    payments.filter(p => {
      const d = p.payment_date || p.created_date?.split("T")[0];
      return d >= monthStart && d <= monthEnd;
    }), [payments, monthStart, monthEnd]);

  const monthExpenses = useMemo(() =>
    expenses.filter(e => {
      const d = e.expense_date || e.created_date?.split("T")[0];
      return d >= monthStart && d <= monthEnd;
    }), [expenses, monthStart, monthEnd]);

  const chatters = useMemo(() => {
    const map = new Map();
    monthPayments.forEach(p => {
      if (p.chatter_email) map.set(p.chatter_email, p.chatter_name || p.chatter_email);
    });
    return Array.from(map.entries()).map(([email, name]) => ({ email, name }));
  }, [monthPayments]);

  const rows = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayPayments = monthPayments.filter(p => (p.payment_date || p.created_date?.split("T")[0]) === dateStr);
      const dayExpenses = monthExpenses.filter(e => (e.expense_date || e.created_date?.split("T")[0]) === dateStr);

      const totalRevenue = dayPayments.reduce((s, p) => s + (p.amount || 0), 0);
      const globalAdSpend = dayExpenses.filter(e => e.category === "marketing").reduce((s, e) => s + (e.amount || 0), 0);
      const globalProfit = totalRevenue - globalAdSpend;
      const firstGlobalAdExpense = dayExpenses.find(e => e.category === "marketing");

      // Per chatter: revenue, ad spend (their own marketing expense), profit
      const chatterRevenues = chatters.map(c => {
        const cPayments = dayPayments.filter(p => p.chatter_email === c.email);
        const revenue = cPayments.reduce((s, p) => s + (p.amount || 0), 0);
        // chatter-specific ad spend: marketing expenses tagged with chatter somehow — 
        // for now we share global ad spend proportionally, but allow editing per chatter via their own expense record
        // We'll use a marketing expense with note = chatter email
        const cAdExpenses = dayExpenses.filter(e => e.category === "marketing" && e.note === c.email);
        const adSpend = cAdExpenses.reduce((s, e) => s + (e.amount || 0), 0);
        const profit = revenue - adSpend;
        const firstAdExp = cAdExpenses[0];
        return { email: c.email, revenue, adSpend, profit, cPayments, firstAdExp, dateStr };
      });

      return {
        day, dateStr, totalRevenue, globalAdSpend, globalProfit,
        firstGlobalAdExpense, chatterRevenues, dayPayments, dayExpenses,
      };
    });
  }, [daysInMonth, viewYear, viewMonth, monthPayments, monthExpenses, chatters]);

  const totals = useMemo(() => ({
    totalRevenue: rows.reduce((s, r) => s + r.totalRevenue, 0),
    adSpend: rows.reduce((s, r) => s + r.globalAdSpend, 0),
    profit: rows.reduce((s, r) => s + r.globalProfit, 0),
    chatterRevenues: chatters.map((c, ci) => ({
      revenue: rows.reduce((s, r) => s + (r.chatterRevenues[ci]?.revenue || 0), 0),
      adSpend: rows.reduce((s, r) => s + (r.chatterRevenues[ci]?.adSpend || 0), 0),
      profit: rows.reduce((s, r) => s + (r.chatterRevenues[ci]?.profit || 0), 0),
    })),
  }), [rows, chatters]);

  // Active days = days with any data
  const activeDays = useMemo(() => rows.filter(r => r.totalRevenue > 0 || r.globalAdSpend > 0).length || 1, [rows]);

  const averages = useMemo(() => ({
    totalRevenue: totals.totalRevenue / activeDays,
    adSpend: totals.adSpend / activeDays,
    profit: totals.profit / activeDays,
    chatterRevenues: chatters.map((c, ci) => ({
      revenue: (totals.chatterRevenues[ci]?.revenue || 0) / activeDays,
      adSpend: (totals.chatterRevenues[ci]?.adSpend || 0) / activeDays,
      profit: (totals.chatterRevenues[ci]?.profit || 0) / activeDays,
    })),
  }), [totals, activeDays, chatters]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const today = new Date().toISOString().split("T")[0];

  const handleGlobalAdSpend = (row, newVal) => {
    if (row.firstGlobalAdExpense) {
      updateExpenseMutation.mutate({ id: row.firstGlobalAdExpense.id, amount: newVal });
    } else {
      createExpenseMutation.mutate({
        title: "Ad Spend",
        amount: newVal,
        category: "marketing",
        expense_date: row.dateStr,
      });
    }
  };

  const handleChatterAdSpend = (cr, newVal) => {
    if (cr.firstAdExp) {
      updateExpenseMutation.mutate({ id: cr.firstAdExp.id, amount: newVal });
    } else {
      createExpenseMutation.mutate({
        title: "Ad Spend",
        amount: newVal,
        category: "marketing",
        note: cr.email,
        expense_date: cr.dateStr,
      });
    }
  };

  const handleChatterRevenue = (cr, newVal) => {
    if (cr.cPayments.length === 1) {
      updatePaymentMutation.mutate({ id: cr.cPayments[0].id, amount: newVal });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-6">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800">Finanční tabulka</h2>
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-sm font-semibold text-gray-700 min-w-[140px] text-center">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button onClick={nextMonth} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-400 hidden sm:block">Kliknutím upravíte hodnotu</p>
          <button
            onClick={() => exportCSV(rows, chatters, viewYear, viewMonth)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:border-[#C9A227] hover:text-[#C9A227] text-xs text-gray-500 transition-all"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            {/* Group headers */}
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="sticky left-0 bg-gray-50 z-10 px-3 py-2" rowSpan={2}></th>
              <th colSpan={3} className="text-center px-3 py-2 font-semibold text-gray-700 border-b border-gray-200 bg-slate-50">
                Celkové
              </th>
              <th className="bg-gray-200 w-px px-0" rowSpan={2}></th>
              {chatters.map(c => (
                <th key={c.email} colSpan={3} className="text-center px-3 py-2 font-semibold text-[#C9A227] border-b border-amber-100 bg-amber-50/40">
                  {c.name.split(" ")[0]}
                </th>
              ))}
            </tr>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-right px-3 py-2 font-medium text-gray-600 bg-slate-50/80 min-w-[90px]">Příjmy</th>
              <th className="text-right px-3 py-2 font-medium text-rose-500 bg-rose-50/20 min-w-[90px]">Ad Spend</th>
              <th className="text-right px-3 py-2 font-medium text-emerald-600 bg-emerald-50/30 min-w-[90px]">Profit</th>
              {chatters.map(c => (
                <React.Fragment key={c.email}>
                  <th className="text-right px-3 py-2 font-medium text-amber-600 bg-amber-50/20 min-w-[90px]">Příjmy</th>
                  <th className="text-right px-3 py-2 font-medium text-rose-400 bg-rose-50/10 min-w-[90px]">Ad Spend</th>
                  <th className="text-right px-3 py-2 font-medium text-emerald-500 bg-emerald-50/10 min-w-[90px]">Profit</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* TOTALS ROW */}
            <SummaryRow label="CELKEM" totals={totals} chatters={chatters} bg="bg-amber-50/30" textClass="text-xs font-bold" />
            {/* AVERAGE ROW */}
            <SummaryRow label="PRŮMĚR / den" totals={averages} chatters={chatters} bg="bg-gray-50/80" textClass="text-xs font-medium" />

            {rows.map(row => {
              const isToday = row.dateStr === today;
              const hasData = row.totalRevenue > 0 || row.globalAdSpend > 0;
              return (
                <tr
                  key={row.day}
                  className={cn(
                    "border-b border-gray-50 transition-colors",
                    isToday ? "bg-amber-50/40" : "hover:bg-gray-50/40",
                    !hasData && "opacity-40"
                  )}
                >
                  <td className={cn(
                    "px-3 py-2 font-medium sticky left-0 z-10 whitespace-nowrap",
                    isToday ? "bg-amber-50/70 text-[#C9A227]" : "bg-white text-gray-500"
                  )}>
                    {String(row.day).padStart(2, "0")}.{String(viewMonth + 1).padStart(2, "0")}.
                    {isToday && <span className="ml-1 text-[10px] text-amber-400">dnes</span>}
                  </td>

                  {/* Global Příjmy — read-only sum */}
                  <td className="px-3 py-2 bg-slate-50/30 text-right tabular-nums text-gray-700 font-medium">
                    {row.totalRevenue > 0 ? fmt(row.totalRevenue) : <span className="text-gray-200">—</span>}
                  </td>

                  {/* Global Ad Spend — editable */}
                  <td className="px-3 py-2 bg-rose-50/10">
                    <EditableCell
                      value={row.globalAdSpend}
                      canCreate={true}
                      onSave={(v) => handleGlobalAdSpend(row, v)}
                    />
                  </td>

                  {/* Global Profit — computed */}
                  <td className={cn("px-3 py-2 text-right tabular-nums font-semibold bg-emerald-50/20",
                    !hasData ? "text-gray-200" : row.globalProfit >= 0 ? "text-emerald-600" : "text-red-500"
                  )}>
                    {hasData ? fmt(row.globalProfit) : "—"}
                  </td>

                  {/* Divider */}
                  <td className="bg-gray-200 w-px p-0"></td>

                  {/* Per-chatter columns */}
                  {row.chatterRevenues.map((cr) => {
                    const chatterHasData = cr.revenue > 0 || cr.adSpend > 0;
                    return (
                      <React.Fragment key={cr.email}>
                        {/* Příjmy */}
                        <td className="px-3 py-2 bg-amber-50/10">
                          {cr.cPayments.length === 1 ? (
                            <EditableCell
                              value={cr.revenue}
                              canCreate={false}
                              onSave={(v) => handleChatterRevenue(cr, v)}
                            />
                          ) : (
                            <div className="text-right tabular-nums text-gray-500">
                              {cr.revenue > 0 ? fmt(cr.revenue) : <span className="text-gray-200">—</span>}
                            </div>
                          )}
                        </td>
                        {/* Ad Spend */}
                        <td className="px-3 py-2 bg-rose-50/10">
                          <EditableCell
                            value={cr.adSpend}
                            canCreate={true}
                            onSave={(v) => handleChatterAdSpend(cr, v)}
                          />
                        </td>
                        {/* Profit */}
                        <td className={cn("px-3 py-2 text-right tabular-nums bg-emerald-50/10",
                          !chatterHasData ? "text-gray-200" : cr.profit >= 0 ? "text-emerald-600" : "text-red-500"
                        )}>
                          {chatterHasData ? fmt(cr.profit) : "—"}
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}