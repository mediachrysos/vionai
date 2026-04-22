import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, TrendingDown, Users, Megaphone, ChevronLeft, ChevronRight } from "lucide-react";

function formatDate(d) {
  return d.toISOString().split("T")[0];
}

function fmt(n) {
  return n.toLocaleString("cs-CZ") + " Kč";
}

export default function AdSpendROIWidget() {
  const [date, setDate] = useState(() => formatDate(new Date()));

  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list("-created_date", 1000),
    staleTime: 60000,
  });

  const { data: adSpends = [] } = useQuery({
    queryKey: ["adSpends"],
    queryFn: () => base44.entities.AdSpend.list("-date", 500),
    staleTime: 60000,
  });

  const { data: models = [] } = useQuery({
    queryKey: ["models"],
    queryFn: () => base44.entities.Model.list(),
    staleTime: 120000,
  });

  const shiftDate = (n) => {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    setDate(formatDate(d));
  };

  const data = useMemo(() => {
    // Ad spend for selected date per model
    const spendByModel = {};
    adSpends
      .filter((a) => a.date === date)
      .forEach((a) => {
        const key = a.model_id || "__global__";
        spendByModel[key] = (spendByModel[key] || 0) + (a.amount || 0);
      });

    // For each (customer, model) pair, find the earliest payment date on that model
    // "nový zákazník na modelce X" = první platba zákazníka na modelce X je dnes
    const firstPaymentByCustomerModel = {};
    [...payments]
      .sort((a, b) => {
        const da = a.payment_date || a.created_date?.split("T")[0] || "";
        const db = b.payment_date || b.created_date?.split("T")[0] || "";
        return da > db ? 1 : -1;
      })
      .forEach((p) => {
        if (!p.customer_id || !p.model_id) return;
        const key = `${p.customer_id}__${p.model_id}`;
        if (!firstPaymentByCustomerModel[key]) {
          firstPaymentByCustomerModel[key] = p;
        }
      });

    // "Noví zákazníci dnes na dané modelce" = záznamy, kde první platba na té modelce je dnes
    const byModel = {};

    Object.values(firstPaymentByCustomerModel).forEach((p) => {
      const firstDate = p.payment_date || p.created_date?.split("T")[0];
      if (firstDate !== date) return;
      const modelId = p.model_id;
      if (!byModel[modelId]) byModel[modelId] = { newCustomers: 0, revenue: 0, adSpend: 0 };
      byModel[modelId].newCustomers += 1;
    });

    // Revenue = všechny platby dnes od nových zákazníků (první platba na té modelce = dnes), přiřazené té modelce
    const newPairs = new Set(
      Object.values(firstPaymentByCustomerModel)
        .filter((p) => (p.payment_date || p.created_date?.split("T")[0]) === date)
        .map((p) => `${p.customer_id}__${p.model_id}`)
    );

    payments.forEach((p) => {
      const pd = p.payment_date || p.created_date?.split("T")[0];
      if (pd !== date || !p.customer_id || !p.model_id) return;
      const pair = `${p.customer_id}__${p.model_id}`;
      if (!newPairs.has(pair)) return;
      const modelId = p.model_id;
      if (!byModel[modelId]) byModel[modelId] = { newCustomers: 0, revenue: 0, adSpend: 0 };
      byModel[modelId].revenue += p.amount || 0;
    });

    // Attach ad spend
    Object.entries(spendByModel).forEach(([modelId, spend]) => {
      if (!byModel[modelId]) byModel[modelId] = { newCustomers: 0, revenue: 0, adSpend: 0 };
      byModel[modelId].adSpend += spend;
    });

    // Fixed order: all known models alphabetically, always shown
    const allModelIds = new Set([
      ...models.map((m) => m.id),
      ...Object.keys(byModel),
    ]);

    const rows = [...allModelIds].map((modelId) => {
      const model = models.find((m) => m.id === modelId);
      if (!model) return null; // skip unknowns without a name
      const d = byModel[modelId] || { newCustomers: 0, revenue: 0, adSpend: 0 };
      return {
        modelId,
        modelName: model.name,
        ...d,
        profit: d.revenue - d.adSpend,
        roi: d.adSpend > 0 ? ((d.revenue - d.adSpend) / d.adSpend) * 100 : null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.modelName.localeCompare(b.modelName, "cs"));

    const totals = rows.reduce(
      (acc, r) => ({ adSpend: acc.adSpend + r.adSpend, revenue: acc.revenue + r.revenue, newCustomers: acc.newCustomers + r.newCustomers }),
      { adSpend: 0, revenue: 0, newCustomers: 0 }
    );
    const totalRoi = totals.adSpend > 0 ? ((totals.revenue - totals.adSpend) / totals.adSpend) * 100 : null;

    return { rows, totals: { ...totals, profit: totals.revenue - totals.adSpend, roi: totalRoi } };
  }, [payments, adSpends, models, date]);

  const displayDate = new Date(date).toLocaleDateString("cs-CZ", { weekday: "long", day: "numeric", month: "long" });
  const isToday = date === formatDate(new Date());

  if (data.rows.length === 0 && data.totals.adSpend === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#C9A227]" />
            <h3 className="text-sm font-semibold text-gray-800">Ad Spend vs. Noví zákazníci</h3>
          </div>
          <DateNav date={date} displayDate={displayDate} isToday={isToday} onShift={shiftDate} />
        </div>
        <p className="text-sm text-gray-400 text-center py-6">Pro tento den nejsou žádná data o ad spendu ani nových zákaznících.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-[#C9A227]" />
          <h3 className="text-sm font-semibold text-gray-800">Ad Spend vs. Noví zákazníci</h3>
        </div>
        <DateNav date={date} displayDate={displayDate} isToday={isToday} onShift={shiftDate} />
      </div>

      {/* Summary totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-red-50 rounded-xl p-3 text-center">
          <p className="text-xs text-red-400 font-medium mb-1">Ad Spend</p>
          <p className="text-base font-bold text-red-600">{fmt(data.totals.adSpend)}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 text-center">
          <p className="text-xs text-emerald-500 font-medium mb-1">Výnos (noví klienti)</p>
          <p className="text-base font-bold text-emerald-600">{fmt(data.totals.revenue)}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-3 text-center">
          <p className="text-xs text-blue-400 font-medium mb-1">Noví zákazníci</p>
          <p className="text-base font-bold text-blue-600">{data.totals.newCustomers}</p>
        </div>
        <div className={`rounded-xl p-3 text-center ${data.totals.roi === null ? "bg-gray-50" : data.totals.roi >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
          <p className={`text-xs font-medium mb-1 ${data.totals.roi === null ? "text-gray-400" : data.totals.roi >= 0 ? "text-emerald-500" : "text-red-400"}`}>Celkové ROI</p>
          <p className={`text-base font-bold ${data.totals.roi === null ? "text-gray-400" : data.totals.roi >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {data.totals.roi !== null ? `${data.totals.roi.toFixed(0)}%` : "—"}
          </p>
        </div>
      </div>

      {/* Per-model table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 font-medium border-b border-gray-100">
              <th className="text-left pb-2 pr-3">Modelka</th>
              <th className="text-right pb-2 px-2">Ad Spend</th>
              <th className="text-right pb-2 px-2">Noví klienti</th>
              <th className="text-right pb-2 px-2">Výnos</th>
              <th className="text-right pb-2 px-2">Profit</th>
              <th className="text-right pb-2 pl-2">ROI</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.modelId} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-2.5 pr-3 font-medium text-gray-800">{row.modelName}</td>
                <td className="py-2.5 px-2 text-right text-red-500">{row.adSpend > 0 ? fmt(row.adSpend) : <span className="text-gray-300">—</span>}</td>
                <td className="py-2.5 px-2 text-right">
                  <span className="inline-flex items-center gap-1 text-blue-600 font-medium">
                    <Users className="w-3 h-3" />
                    {row.newCustomers}
                  </span>
                </td>
                <td className="py-2.5 px-2 text-right text-emerald-600 font-medium">{row.revenue > 0 ? fmt(row.revenue) : <span className="text-gray-300">—</span>}</td>
                <td className="py-2.5 px-2 text-right">
                  {row.adSpend > 0 ? (
                    <span className={`font-semibold ${row.profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {fmt(row.profit)}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="py-2.5 pl-2 text-right">
                  {row.roi !== null ? (
                    <span className={`inline-flex items-center gap-1 font-semibold ${row.roi >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {row.roi >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {row.roi.toFixed(0)}%
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DateNav({ displayDate, isToday, onShift }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onShift(-1)} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center">
        <ChevronLeft className="w-4 h-4 text-gray-500" />
      </button>
      <span className="text-xs font-medium text-gray-600 capitalize">{displayDate}</span>
      <button onClick={() => onShift(1)} disabled={isToday} className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center disabled:opacity-30">
        <ChevronRight className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  );
}