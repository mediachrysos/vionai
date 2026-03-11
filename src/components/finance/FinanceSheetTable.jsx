import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Pencil, Check, X } from "lucide-react";
import { format, getDaysInMonth, startOfMonth } from "date-fns";
import { cs } from "date-fns/locale";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "Leden","Únor","Březen","Duben","Květen","Červen",
  "Červenec","Srpen","Září","Říjen","Listopad","Prosinec"
];

function EditableCell({ value, onSave, prefix = "", suffix = " Kč" }) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");

  const start = () => {
    setInput(value.toString());
    setEditing(true);
  };

  const cancel = () => setEditing(false);

  const save = () => {
    const num = parseFloat(input);
    if (!isNaN(num) && num !== value) onSave(num);
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
          className="w-24 text-right text-xs border border-indigo-400 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        <button onClick={save} className="text-emerald-500 hover:text-emerald-700"><Check className="w-3.5 h-3.5" /></button>
        <button onClick={cancel} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5" /></button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-end gap-1 group cursor-pointer"
      onClick={value > 0 ? start : undefined}
    >
      <span className={cn("text-xs tabular-nums", value > 0 ? "group-hover:text-indigo-600" : "text-gray-300")}>
        {value > 0 ? `${prefix}${value.toLocaleString("cs-CZ")}${suffix}` : "—"}
      </span>
      {value > 0 && (
        <Pencil className="w-2.5 h-2.5 text-gray-300 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
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
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({ id, amount }) => base44.entities.Payment.update(id, { amount }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["payments"] }),
  });
  const updateExpenseMutation = useMutation({
    mutationFn: ({ id, amount }) => base44.entities.Expense.update(id, { amount }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });

  // Filter to current month
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

  // Unique chatters from payments this month
  const chatters = useMemo(() => {
    const map = new Map();
    monthPayments.forEach(p => {
      if (p.chatter_email) {
        map.set(p.chatter_email, p.chatter_name || p.chatter_email);
      }
    });
    return Array.from(map.entries()).map(([email, name]) => ({ email, name }));
  }, [monthPayments]);

  // Build row data per day
  const rows = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      const dayPayments = monthPayments.filter(p =>
        (p.payment_date || p.created_date?.split("T")[0]) === dateStr
      );
      const dayExpenses = monthExpenses.filter(e =>
        (e.expense_date || e.created_date?.split("T")[0]) === dateStr
      );

      const totalRevenue = dayPayments.reduce((s, p) => s + (p.amount || 0), 0);
      const chatterRevenues = chatters.map(c => ({
        email: c.email,
        total: dayPayments
          .filter(p => p.chatter_email === c.email)
          .reduce((s, p) => s + (p.amount || 0), 0),
        payments: dayPayments.filter(p => p.chatter_email === c.email),
      }));
      const salaries = dayExpenses
        .filter(e => e.category === "salaries")
        .reduce((s, e) => s + (e.amount || 0), 0);
      const adSpend = dayExpenses
        .filter(e => e.category === "marketing")
        .reduce((s, e) => s + (e.amount || 0), 0);
      const totalCosts = dayExpenses.reduce((s, e) => s + (e.amount || 0), 0);
      const profit = totalRevenue - totalCosts;

      // For inline editing: get first matching expense record of that category on that day
      const firstSalaryExpense = dayExpenses.find(e => e.category === "salaries");
      const firstAdExpense = dayExpenses.find(e => e.category === "marketing");

      return {
        day, dateStr, totalRevenue, chatterRevenues,
        salaries, adSpend, totalCosts, profit,
        firstSalaryExpense, firstAdExpense,
        dayPayments, dayExpenses,
      };
    });
  }, [daysInMonth, viewYear, viewMonth, monthPayments, monthExpenses, chatters]);

  // Totals row
  const totals = useMemo(() => ({
    totalRevenue: rows.reduce((s, r) => s + r.totalRevenue, 0),
    chatterRevenues: chatters.map((c, ci) => ({
      email: c.email,
      total: rows.reduce((s, r) => s + r.chatterRevenues[ci]?.total || 0, 0),
    })),
    salaries: rows.reduce((s, r) => s + r.salaries, 0),
    adSpend: rows.reduce((s, r) => s + r.adSpend, 0),
    totalCosts: rows.reduce((s, r) => s + r.totalCosts, 0),
    profit: rows.reduce((s, r) => s + r.profit, 0),
  }), [rows, chatters]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-6">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-800">Finanční tabulka</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-sm font-semibold text-gray-700 min-w-[140px] text-center">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button
            onClick={nextMonth}
            className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <p className="text-xs text-gray-400">Kliknutím na hodnotu ji upravíte</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 font-semibold text-gray-500 w-24 sticky left-0 bg-gray-50 z-10">Datum</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700 bg-indigo-50/50">Příjmy celkem</th>
              {chatters.map(c => (
                <th key={c.email} className="text-right px-4 py-3 font-semibold text-indigo-500">
                  {c.name.split(" ")[0]}
                </th>
              ))}
              <th className="text-right px-4 py-3 font-semibold text-orange-500">Výplata</th>
              <th className="text-right px-4 py-3 font-semibold text-rose-500">Ad Spend</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-600">Náklady</th>
              <th className="text-right px-4 py-3 font-semibold text-emerald-600 bg-emerald-50/50">Zisk</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const isToday = row.dateStr === today;
              const hasData = row.totalRevenue > 0 || row.totalCosts > 0;
              return (
                <tr
                  key={row.day}
                  className={cn(
                    "border-b border-gray-50 transition-colors",
                    isToday ? "bg-indigo-50/40" : "hover:bg-gray-50/50",
                    !hasData && "opacity-50"
                  )}
                >
                  <td className={cn(
                    "px-4 py-2 font-medium sticky left-0 z-10",
                    isToday ? "bg-indigo-50/70 text-indigo-600" : "bg-white text-gray-600"
                  )}>
                    {String(row.day).padStart(2, "0")}.{String(viewMonth + 1).padStart(2, "0")}.
                    {isToday && <span className="ml-1 text-[10px] text-indigo-400">dnes</span>}
                  </td>

                  {/* Total revenue — sum of all payments, edit by distributing proportionally or just showing total */}
                  <td className="px-4 py-2 bg-indigo-50/20">
                    <div className="flex items-center justify-end">
                      <span className={cn("tabular-nums", row.totalRevenue > 0 ? "font-semibold text-gray-800" : "text-gray-300")}>
                        {row.totalRevenue > 0 ? `${row.totalRevenue.toLocaleString("cs-CZ")} Kč` : "—"}
                      </span>
                    </div>
                  </td>

                  {/* Per-chatter revenue */}
                  {row.chatterRevenues.map(cr => (
                    <td key={cr.email} className="px-4 py-2">
                      {cr.payments.length === 1 ? (
                        <EditableCell
                          value={cr.total}
                          onSave={(newVal) => updatePaymentMutation.mutate({ id: cr.payments[0].id, amount: newVal })}
                        />
                      ) : (
                        <div className="text-right tabular-nums text-gray-500">
                          {cr.total > 0 ? `${cr.total.toLocaleString("cs-CZ")} Kč` : "—"}
                        </div>
                      )}
                    </td>
                  ))}

                  {/* Salaries */}
                  <td className="px-4 py-2">
                    <EditableCell
                      value={row.salaries}
                      onSave={(newVal) => row.firstSalaryExpense && updateExpenseMutation.mutate({ id: row.firstSalaryExpense.id, amount: newVal })}
                    />
                  </td>

                  {/* Ad Spend */}
                  <td className="px-4 py-2">
                    <EditableCell
                      value={row.adSpend}
                      onSave={(newVal) => row.firstAdExpense && updateExpenseMutation.mutate({ id: row.firstAdExpense.id, amount: newVal })}
                    />
                  </td>

                  {/* Total costs */}
                  <td className="px-4 py-2 text-right tabular-nums text-gray-600">
                    {row.totalCosts > 0 ? `${row.totalCosts.toLocaleString("cs-CZ")} Kč` : "—"}
                  </td>

                  {/* Profit */}
                  <td className={cn("px-4 py-2 text-right tabular-nums font-semibold bg-emerald-50/20",
                    row.profit > 0 ? "text-emerald-600" : row.profit < 0 ? "text-red-500" : "text-gray-300"
                  )}>
                    {(row.totalRevenue > 0 || row.totalCosts > 0)
                      ? `${row.profit.toLocaleString("cs-CZ")} Kč`
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Totals footer */}
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
              <td className="px-4 py-3 text-gray-700 text-xs sticky left-0 bg-gray-50">SOUČET</td>
              <td className="px-4 py-3 text-right tabular-nums text-gray-800 bg-indigo-50/30">
                {totals.totalRevenue.toLocaleString("cs-CZ")} Kč
              </td>
              {totals.chatterRevenues.map(cr => (
                <td key={cr.email} className="px-4 py-3 text-right tabular-nums text-indigo-600">
                  {cr.total.toLocaleString("cs-CZ")} Kč
                </td>
              ))}
              <td className="px-4 py-3 text-right tabular-nums text-orange-500">
                {totals.salaries.toLocaleString("cs-CZ")} Kč
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-rose-500">
                {totals.adSpend.toLocaleString("cs-CZ")} Kč
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                {totals.totalCosts.toLocaleString("cs-CZ")} Kč
              </td>
              <td className={cn("px-4 py-3 text-right tabular-nums bg-emerald-50/30",
                totals.profit >= 0 ? "text-emerald-600" : "text-red-500"
              )}>
                {totals.profit.toLocaleString("cs-CZ")} Kč
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}