import React, { useState, useMemo } from "react";
import { format, startOfWeek, parseISO } from "date-fns";
import { ChevronDown, ChevronRight, Landmark } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkspace } from "@/lib/WorkspaceContext";

const GRANULARITIES = [
{ key: "day", label: "Day" },
{ key: "week", label: "Week" },
{ key: "month", label: "Month" }];


function getPeriodKey(dateStr, granularity) {
  const d = parseISO(dateStr);
  if (granularity === "day") return format(d, "yyyy-MM-dd");
  if (granularity === "week") return format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
  return format(d, "yyyy-MM");
}

function getPeriodLabel(key, granularity) {
  if (granularity === "month") {
    const [y, m] = key.split("-");
    return format(new Date(Number(y), Number(m) - 1, 1), "MMMM yyyy");
  }
  if (granularity === "week") {
    const start = parseISO(key);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${format(start, "d. M.")} – ${format(end, "d. M. yyyy")}`;
  }
  return format(parseISO(key), "EEEE d. M. yyyy");
}

export default function AccountBreakdownSection({ accounts, payments, walletTxs }) {
  const { currency } = useWorkspace();
  const [granularity, setGranularity] = useState("month");
  const [accountId, setAccountId] = useState("all");
  const [expanded, setExpanded] = useState(null);

  const normalized = useMemo(() => {
    const paymentTxs = payments.
    filter((p) => p.status !== "failed" && p.status !== "refunded" && p.bank_account_id && p.payment_date).
    map((p) => ({
      id: "pay_" + p.id,
      title: p.customer_name ? `Payment – ${p.customer_name}` : "Customer payment",
      amount: p.amount || 0,
      type: "income",
      date: p.payment_date,
      account_id: p.bank_account_id
    }));
    const txs = walletTxs.
    filter((t) => t.account_id && (t.type === "income" || t.type === "expense") && (t.transaction_date || t.created_date)).
    map((t) => ({
      id: t.id,
      title: t.title,
      amount: t.amount || 0,
      type: t.type,
      date: t.transaction_date || t.created_date?.split("T")[0],
      account_id: t.account_id
    }));
    return [...paymentTxs, ...txs];
  }, [payments, walletTxs]);

  const filtered = useMemo(() => {
    if (accountId === "all") return normalized;
    return normalized.filter((t) => t.account_id === accountId);
  }, [normalized, accountId]);

  const periods = useMemo(() => {
    const map = new Map();
    filtered.forEach((t) => {
      const key = getPeriodKey(t.date, granularity);
      if (!map.has(key)) map.set(key, { income: 0, expense: 0, items: [] });
      const bucket = map.get(key);
      if (t.type === "income") bucket.income += t.amount;else bucket.expense += t.amount;
      bucket.items.push(t);
    });
    return Array.from(map.entries()).
    map(([key, v]) => ({ key, ...v, net: v.income - v.expense })).
    sort((a, b) => b.key.localeCompare(a.key));
  }, [filtered, granularity]);

  return (
    <div className="bg-[#1e1e1e] rounded-2xl border border-white/10 shadow-[0_6px_20px_rgba(0,0,0,0.3)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
          <Landmark className="w-4 h-4 text-[#C9A227] hidden" /> Account breakdown
        </h3>
        <div className="flex items-center gap-2">
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="h-8 text-xs w-44 border-white/10 bg-white/5 text-slate-300">
              <SelectValue placeholder="Account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-0.5 bg-white/5 rounded-lg p-0.5 border border-white/10">
            {GRANULARITIES.map((g) =>
            <button
              key={g.key}
              onClick={() => setGranularity(g.key)}
              className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${granularity === g.key ? "bg-white/10 shadow-sm text-slate-200 border border-white/10" : "text-slate-500 hover:text-slate-300"}`}>

                {g.label}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {periods.length === 0 ?
        <div className="text-center py-10 text-sm text-slate-500">No data for this selection</div> :
        periods.map((p) => {
          const isOpen = expanded === p.key;
          return (
            <div key={p.key} className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : p.key)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/10 transition-colors">

                <div className="flex items-center gap-2 min-w-0">
                  {isOpen ? <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />}
                  <span className="text-sm font-medium text-slate-200 truncate">{getPeriodLabel(p.key, granularity)}</span>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-xs text-emerald-400 font-semibold">+{p.income.toLocaleString()} {currency}</span>
                  <span className="text-xs text-red-400 font-semibold">–{p.expense.toLocaleString()} {currency}</span>
                  <span className={`text-sm font-bold w-24 text-right ${p.net >= 0 ? "text-[#C9A227]" : "text-red-500"}`}>{p.net.toLocaleString()} {currency}</span>
                </div>
              </button>
              {isOpen &&
              <div className="border-t border-white/10 divide-y divide-white/5">
                  {p.items.sort((a, b) => b.date.localeCompare(a.date)).map((item) =>
                <div key={item.id} className="flex items-center justify-between px-4 py-2.5 pl-9">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-300 truncate">{item.title}</p>
                        <p className="text-[10px] text-slate-500">{format(parseISO(item.date), "d. M. yyyy")}</p>
                      </div>
                      <p className={`text-xs font-semibold flex-shrink-0 ml-3 ${item.type === "income" ? "text-emerald-400" : "text-red-400"}`}>
                        {item.type === "income" ? "+" : "–"}{item.amount.toLocaleString()} {currency}
                      </p>
                    </div>
                )}
                </div>
              }
            </div>);

        })}
      </div>
    </div>);

}