import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { usePayments } from "@/hooks/usePayments";
import { TrendingUp, TrendingDown, Users, Megaphone, ChevronLeft, ChevronRight } from "lucide-react";
import ModelROIChart from "./ModelROIChart";

function formatDate(d) {
  return d.toISOString().split("T")[0];
}

function fmt(n) {
  return n.toLocaleString("cs-CZ") + " Kč";
}

export default function AdSpendROIWidget() {
  const [date, setDate] = useState(() => formatDate(new Date()));

  const { data: payments = [] } = usePayments();

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
    // === LONG-TERM ROI per model (all history) ===
    // Total ad spend per model across all days
    const allTimeSpendByModel = {};
    adSpends.forEach((a) => {
      const key = a.model_id || "__global__";
      allTimeSpendByModel[key] = (allTimeSpendByModel[key] || 0) + (a.amount || 0);
    });

    // First payment per (customer, model) pair across all history
    const allFirstPayments = {};
    [...payments]
      .sort((a, b) => {
        const da = a.payment_date || a.created_date?.split("T")[0] || "";
        const db = b.payment_date || b.created_date?.split("T")[0] || "";
        return da > db ? 1 : -1;
      })
      .forEach((p) => {
        if (!p.customer_id || !p.model_id) return;
        const key = `${p.customer_id}__${p.model_id}`;
        if (!allFirstPayments[key]) allFirstPayments[key] = p;
      });

    // Revenue from new customers (first payment on that model) per model — all time
    const allTimeRevenueByModel = {};
    const allNewPairs = new Set(Object.keys(allFirstPayments));
    payments.forEach((p) => {
      if (!p.customer_id || !p.model_id) return;
      const pair = `${p.customer_id}__${p.model_id}`;
      if (!allNewPairs.has(pair)) return;
      allTimeRevenueByModel[p.model_id] = (allTimeRevenueByModel[p.model_id] || 0) + (p.amount || 0);
    });

    // Average daily ROI per model (average across days that had ad spend)
    const allTimeRoiByModel = {};
    models.forEach((m) => {
      const days = adSpends.filter((a) => a.model_id === m.id);
      const uniqueDates = [...new Set(days.map((a) => a.date))];
      const dailyRois = uniqueDates.map((d) => {
        const spend = adSpends.filter((a) => a.model_id === m.id && a.date === d).reduce((s, a) => s + a.amount, 0);
        const revenue = payments.filter((p) => {
          const pd = p.payment_date || p.created_date?.split("T")[0];
          if (pd !== d || p.model_id !== m.id || !p.customer_id) return false;
          const pair = `${p.customer_id}__${p.model_id}`;
          return allFirstPayments[pair] && (allFirstPayments[pair].payment_date || allFirstPayments[pair].created_date?.split("T")[0]) === d;
        }).reduce((s, p) => s + (p.amount || 0), 0);
        return spend > 0 ? ((revenue - spend) / spend) * 100 : null;
      }).filter((r) => r !== null);
      allTimeRoiByModel[m.id] = dailyRois.length > 0 ? dailyRois.reduce((s, r) => s + r, 0) / dailyRois.length : null;
    });

    // === TODAY ===
    const spendByModel = {};
    adSpends
      .filter((a) => a.date === date)
      .forEach((a) => {
        const key = a.model_id || "__global__";
        spendByModel[key] = (spendByModel[key] || 0) + (a.amount || 0);
      });

    const firstPaymentByCustomerModel = allFirstPayments;

    const byModel = {};
    Object.values(firstPaymentByCustomerModel).forEach((p) => {
      const firstDate = p.payment_date || p.created_date?.split("T")[0];
      if (firstDate !== date) return;
      const modelId = p.model_id;
      if (!byModel[modelId]) byModel[modelId] = { newCustomers: 0, revenue: 0, adSpend: 0 };
      byModel[modelId].newCustomers += 1;
    });

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

    Object.entries(spendByModel).forEach(([modelId, spend]) => {
      if (!byModel[modelId]) byModel[modelId] = { newCustomers: 0, revenue: 0, adSpend: 0 };
      byModel[modelId].adSpend += spend;
    });

    const allModelIds = new Set([...models.map((m) => m.id), ...Object.keys(byModel)]);

    // All-time cost per customer per model
    const allTimeCpcByModel = {};
    models.forEach((m) => {
      const totalSpend = allTimeSpendByModel[m.id] || 0;
      const totalNewCustomers = Object.values(allFirstPayments).filter(
        (p) => p.model_id === m.id
      ).length;
      allTimeCpcByModel[m.id] = totalNewCustomers > 0 ? totalSpend / totalNewCustomers : null;
    });

    // All-time average value per customer per model
    const allTimeAvgValueByModel = {};
    models.forEach((m) => {
      const totalNewCustomers = Object.values(allFirstPayments).filter(
        (p) => p.model_id === m.id
      ).length;
      const totalRevenue = allTimeRevenueByModel[m.id] || 0;
      allTimeAvgValueByModel[m.id] = totalNewCustomers > 0 ? totalRevenue / totalNewCustomers : null;
    });

    const rows = [...allModelIds].map((modelId) => {
    const model = models.find((m) => m.id === modelId);
    if (!model) return null;
    const d = byModel[modelId] || { newCustomers: 0, revenue: 0, adSpend: 0 };
    return {
      modelId,
      modelName: model.name,
      ...d,
      profit: d.revenue - d.adSpend,
      roi: d.adSpend > 0 ? ((d.revenue - d.adSpend) / d.adSpend) * 100 : null,
      allTimeRoi: allTimeRoiByModel[modelId] ?? null,
      cpc: d.newCustomers > 0 ? d.adSpend / d.newCustomers : null,
      allTimeCpc: allTimeCpcByModel[modelId] ?? null,
      avgValue: d.newCustomers > 0 ? d.revenue / d.newCustomers : null,
      allTimeAvgValue: allTimeAvgValueByModel[modelId] ?? null,
      profitPerCustomer: (d.newCustomers > 0 && d.newCustomers > 0) ? (d.revenue / d.newCustomers) - (d.adSpend / d.newCustomers) : null,
      allTimeProfitPerCustomer: (allTimeAvgValueByModel[modelId] !== null && allTimeCpcByModel[modelId] !== null) ? allTimeAvgValueByModel[modelId] - allTimeCpcByModel[modelId] : null,
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
      <div className="bg-[#1e1e1e] rounded-2xl border border-white/10 p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[#C9A227]" />
            <h3 className="text-sm font-semibold text-slate-200">Ad Spend vs. Noví zákazníci</h3>
          </div>
          <DateNav date={date} displayDate={displayDate} isToday={isToday} onShift={shiftDate} />
        </div>
        <p className="text-sm text-slate-500 text-center py-6">Pro tento den nejsou žádná data o ad spendu ani nových zákaznících.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#1e1e1e] rounded-2xl border border-white/10 p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-[#C9A227]" />
          <h3 className="text-sm font-semibold text-slate-200">Ad Spend vs. Noví zákazníci</h3>
        </div>
        <DateNav date={date} displayDate={displayDate} isToday={isToday} onShift={shiftDate} />
      </div>

      {/* Summary totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-red-950/30 rounded-xl p-3 text-center border border-red-700/20">
          <p className="text-xs text-red-400 font-medium mb-1">Ad Spend</p>
          <p className="text-base font-bold text-red-400">{fmt(data.totals.adSpend)}</p>
        </div>
        <div className="bg-emerald-950/30 rounded-xl p-3 text-center border border-emerald-700/20">
          <p className="text-xs text-emerald-400 font-medium mb-1">Výnos (noví klienti)</p>
          <p className="text-base font-bold text-emerald-400">{fmt(data.totals.revenue)}</p>
        </div>
        <div className="bg-blue-950/30 rounded-xl p-3 text-center border border-blue-700/20">
          <p className="text-xs text-blue-400 font-medium mb-1">Noví zákazníci</p>
          <p className="text-base font-bold text-blue-400">{data.totals.newCustomers}</p>
        </div>
        <div className={`rounded-xl p-3 text-center border ${data.totals.roi === null ? "bg-white/5 border-white/10" : data.totals.roi >= 0 ? "bg-emerald-950/30 border-emerald-700/20" : "bg-red-950/30 border-red-700/20"}`}>
          <p className={`text-xs font-medium mb-1 ${data.totals.roi === null ? "text-slate-500" : data.totals.roi >= 0 ? "text-emerald-400" : "text-red-400"}`}>Celkové ROI</p>
          <p className={`text-base font-bold ${data.totals.roi === null ? "text-slate-500" : data.totals.roi >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {data.totals.roi !== null ? `${data.totals.roi.toFixed(0)}%` : "—"}
          </p>
        </div>
      </div>

      {/* Per-model table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            {/* Group headers */}
            <tr className="text-[10px] font-semibold uppercase tracking-wider">
              <th className="pb-1 pr-3" />
              <th colSpan={5} className="pb-1 px-2 text-center text-slate-500 border-b-2 border-white/10">Dnešní výsledky</th>
              <th colSpan={2} className="pb-1 px-2 text-center text-[#C9A227] border-b-2 border-amber-700/30">Cena za získání zákazníka</th>
              <th colSpan={2} className="pb-1 px-2 text-center text-emerald-400 border-b-2 border-emerald-700/30">Průměrná hodnota zákazníka</th>
              <th colSpan={2} className="pb-1 px-2 text-center text-violet-400 border-b-2 border-violet-700/30">Zisk na zákazníka (hodnota − cena)</th>
              <th colSpan={1} className="pb-1 pl-2 text-center text-indigo-400 border-b-2 border-indigo-700/30">Celkový průměr</th>
            </tr>
            {/* Column headers */}
            <tr className="text-xs text-slate-500 font-medium">
              <th className="text-left pt-2 pb-3 pr-3 min-w-[120px]">Modelka</th>
              <th className="text-center pt-2 pb-3 px-2 whitespace-nowrap">Ad Spend</th>
              <th className="text-center pt-2 pb-3 px-2 whitespace-nowrap">Noví klienti</th>
              <th className="text-center pt-2 pb-3 px-2 whitespace-nowrap">Výnos</th>
              <th className="text-center pt-2 pb-3 px-2 whitespace-nowrap">Profit</th>
              <th className="text-center pt-2 pb-3 px-2 whitespace-nowrap">ROI</th>
              <th className="text-center pt-2 pb-3 px-2 whitespace-nowrap text-[#C9A227]">Dnes (ad spend ÷ noví klienti)</th>
              <th className="text-center pt-2 pb-3 px-2 whitespace-nowrap text-[#C9A227]">Ø Historicky</th>
              <th className="text-center pt-2 pb-3 px-2 whitespace-nowrap text-emerald-500">Dnes (výnos ÷ noví klienti)</th>
              <th className="text-center pt-2 pb-3 px-2 whitespace-nowrap text-emerald-500">Ø Historicky</th>
              <th className="text-center pt-2 pb-3 px-2 whitespace-nowrap text-violet-500">Dnes (hodnota − cena)</th>
              <th className="text-center pt-2 pb-3 px-2 whitespace-nowrap text-violet-500">Ø Historicky</th>
              <th className="text-center pt-2 pb-3 pl-2 whitespace-nowrap text-indigo-400">Ø ROI/den</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.modelId} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                <td className="py-3 pr-3 font-semibold text-slate-200 text-sm">{row.modelName}</td>

                {/* Ad Spend */}
                <td className="py-3 px-2 text-center">
                  {row.adSpend > 0
                    ? <span className="text-red-400 font-medium">{fmt(row.adSpend)}</span>
                    : <span className="text-slate-700">—</span>}
                </td>

                {/* Noví klienti */}
                <td className="py-3 px-2 text-center">
                  <span className={`inline-flex items-center justify-center gap-1 font-semibold ${row.newCustomers > 0 ? "text-blue-400" : "text-slate-700"}`}>
                    <Users className="w-3 h-3" />
                    {row.newCustomers}
                  </span>
                </td>

                {/* Výnos */}
                <td className="py-3 px-2 text-center">
                  {row.revenue > 0
                    ? <span className="text-emerald-400 font-medium">{fmt(row.revenue)}</span>
                    : <span className="text-slate-700">—</span>}
                </td>

                {/* Profit */}
                <td className="py-3 px-2 text-center">
                  {row.adSpend > 0 ? (
                    <span className={`font-semibold ${row.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {fmt(row.profit)}
                    </span>
                  ) : <span className="text-slate-700">—</span>}
                </td>

                {/* ROI dnes */}
                <td className="py-3 px-2 text-center">
                  {row.roi !== null ? (
                    <span className={`inline-flex items-center justify-center gap-0.5 font-bold text-sm ${row.roi >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {row.roi >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {row.roi.toFixed(0)}%
                    </span>
                  ) : <span className="text-slate-700">—</span>}
                </td>

                {/* CPC dnes */}
                <td className="py-3 px-2 text-center">
                  {row.cpc !== null ? (
                    <span className="inline-block bg-amber-950/40 border border-amber-700/30 text-amber-300 font-semibold text-xs px-2 py-1 rounded-lg">
                      {fmt(Math.round(row.cpc))}
                    </span>
                  ) : <span className="text-slate-700">—</span>}
                </td>

                {/* CPC all-time */}
                <td className="py-3 px-2 text-center">
                  {row.allTimeCpc !== null ? (
                    <span className="inline-block bg-amber-950/30 border border-amber-700/20 text-amber-400 font-medium text-xs px-2 py-1 rounded-lg">
                      {fmt(Math.round(row.allTimeCpc))}
                    </span>
                  ) : <span className="text-slate-700">—</span>}
                </td>

                {/* Avg value dnes */}
                <td className="py-3 px-2 text-center">
                  {row.avgValue !== null ? (
                    <span className="inline-block bg-emerald-950/40 border border-emerald-700/30 text-emerald-300 font-semibold text-xs px-2 py-1 rounded-lg">
                      {fmt(Math.round(row.avgValue))}
                    </span>
                  ) : <span className="text-slate-700">—</span>}
                </td>

                {/* Avg value all-time */}
                <td className="py-3 px-2 text-center">
                  {row.allTimeAvgValue !== null ? (
                    <span className="inline-block bg-emerald-950/30 border border-emerald-700/20 text-emerald-400 font-medium text-xs px-2 py-1 rounded-lg">
                      {fmt(Math.round(row.allTimeAvgValue))}
                    </span>
                  ) : <span className="text-slate-700">—</span>}
                </td>

                {/* Zisk/zákazník dnes */}
                <td className="py-3 px-2 text-center">
                  {row.profitPerCustomer !== null ? (
                    <span className={`inline-block border font-semibold text-xs px-2 py-1 rounded-lg ${row.profitPerCustomer >= 0 ? "bg-violet-950/40 border-violet-700/30 text-violet-300" : "bg-red-950/40 border-red-700/30 text-red-400"}`}>
                      {fmt(Math.round(row.profitPerCustomer))}
                    </span>
                  ) : <span className="text-slate-700">—</span>}
                </td>

                {/* Zisk/zákazník all-time */}
                <td className="py-3 px-2 text-center">
                  {row.allTimeProfitPerCustomer !== null ? (
                    <span className={`inline-block border font-medium text-xs px-2 py-1 rounded-lg ${row.allTimeProfitPerCustomer >= 0 ? "bg-violet-950/30 border-violet-700/20 text-violet-400" : "bg-red-950/30 border-red-700/20 text-red-400"}`}>
                      {fmt(Math.round(row.allTimeProfitPerCustomer))}
                    </span>
                  ) : <span className="text-slate-700">—</span>}
                </td>

                {/* Ø ROI all-time */}
                <td className="py-3 pl-2 text-center">
                  {row.allTimeRoi !== null ? (
                    <span className={`inline-flex items-center justify-center gap-0.5 font-bold text-xs px-2 py-1 rounded-lg ${row.allTimeRoi >= 0 ? "bg-indigo-950/40 text-indigo-300" : "bg-red-950/40 text-red-400"}`}>
                      {row.allTimeRoi >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {row.allTimeRoi.toFixed(0)}%
                    </span>
                  ) : <span className="text-slate-700 text-xs">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ModelROIChart payments={payments} adSpends={adSpends} models={models} />
    </div>
  );
}

function DateNav({ displayDate, isToday, onShift }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onShift(-1)} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center">
        <ChevronLeft className="w-4 h-4 text-slate-400" />
      </button>
      <span className="text-xs font-medium text-slate-400 capitalize">{displayDate}</span>
      <button onClick={() => onShift(1)} disabled={isToday} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center disabled:opacity-30">
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </button>
    </div>
  );
}