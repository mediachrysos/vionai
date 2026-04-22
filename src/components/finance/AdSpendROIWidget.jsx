import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
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
        <table className="w-full text-sm border-separate border-spacing-0">
          <thead>
            {/* Group headers */}
            <tr className="text-[10px] font-semibold uppercase tracking-wider">
              <th className="pb-1 pr-3" />
              <th colSpan={5} className="pb-1 px-2 text-center text-gray-400 border-b-2 border-gray-200">Dnešní výsledky</th>
              <th colSpan={2} className="pb-1 px-2 text-center text-[#C9A227] border-b-2 border-amber-200">Cena za získání zákazníka</th>
              <th colSpan={2} className="pb-1 px-2 text-center text-emerald-500 border-b-2 border-emerald-200">Průměrná hodnota zákazníka</th>
              <th colSpan={1} className="pb-1 pl-2 text-center text-indigo-400 border-b-2 border-indigo-200">Celkový průměr</th>
            </tr>
            {/* Column headers */}
            <tr className="text-xs text-gray-400 font-medium">
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
              <th className="text-center pt-2 pb-3 pl-2 whitespace-nowrap text-indigo-400">Ø ROI/den</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.modelId} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors group">
                <td className="py-3 pr-3 font-semibold text-gray-800 text-sm">{row.modelName}</td>

                {/* Ad Spend */}
                <td className="py-3 px-2 text-center">
                  {row.adSpend > 0
                    ? <span className="text-red-500 font-medium">{fmt(row.adSpend)}</span>
                    : <span className="text-gray-200">—</span>}
                </td>

                {/* Noví klienti */}
                <td className="py-3 px-2 text-center">
                  <span className={`inline-flex items-center justify-center gap-1 font-semibold ${row.newCustomers > 0 ? "text-blue-600" : "text-gray-300"}`}>
                    <Users className="w-3 h-3" />
                    {row.newCustomers}
                  </span>
                </td>

                {/* Výnos */}
                <td className="py-3 px-2 text-center">
                  {row.revenue > 0
                    ? <span className="text-emerald-600 font-medium">{fmt(row.revenue)}</span>
                    : <span className="text-gray-200">—</span>}
                </td>

                {/* Profit */}
                <td className="py-3 px-2 text-center">
                  {row.adSpend > 0 ? (
                    <span className={`font-semibold ${row.profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {fmt(row.profit)}
                    </span>
                  ) : <span className="text-gray-200">—</span>}
                </td>

                {/* ROI dnes */}
                <td className="py-3 px-2 text-center">
                  {row.roi !== null ? (
                    <span className={`inline-flex items-center justify-center gap-0.5 font-bold text-sm ${row.roi >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {row.roi >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {row.roi.toFixed(0)}%
                    </span>
                  ) : <span className="text-gray-200">—</span>}
                </td>

                {/* CPC dnes */}
                <td className="py-3 px-2 text-center">
                  {row.cpc !== null ? (
                    <span className="inline-block bg-amber-50 border border-amber-100 text-amber-700 font-semibold text-xs px-2 py-1 rounded-lg">
                      {fmt(Math.round(row.cpc))}
                    </span>
                  ) : <span className="text-gray-200">—</span>}
                </td>

                {/* CPC all-time */}
                <td className="py-3 px-2 text-center">
                  {row.allTimeCpc !== null ? (
                    <span className="inline-block bg-amber-50 border border-amber-100 text-amber-600 font-medium text-xs px-2 py-1 rounded-lg">
                      {fmt(Math.round(row.allTimeCpc))}
                    </span>
                  ) : <span className="text-gray-200">—</span>}
                </td>

                {/* Avg value dnes */}
                <td className="py-3 px-2 text-center">
                  {row.avgValue !== null ? (
                    <span className="inline-block bg-emerald-50 border border-emerald-100 text-emerald-700 font-semibold text-xs px-2 py-1 rounded-lg">
                      {fmt(Math.round(row.avgValue))}
                    </span>
                  ) : <span className="text-gray-200">—</span>}
                </td>

                {/* Avg value all-time */}
                <td className="py-3 px-2 text-center">
                  {row.allTimeAvgValue !== null ? (
                    <span className="inline-block bg-emerald-50 border border-emerald-100 text-emerald-600 font-medium text-xs px-2 py-1 rounded-lg">
                      {fmt(Math.round(row.allTimeAvgValue))}
                    </span>
                  ) : <span className="text-gray-200">—</span>}
                </td>

                {/* Ø ROI all-time */}
                <td className="py-3 pl-2 text-center">
                  {row.allTimeRoi !== null ? (
                    <span className={`inline-flex items-center justify-center gap-0.5 font-bold text-xs px-2 py-1 rounded-lg ${row.allTimeRoi >= 0 ? "bg-indigo-50 text-indigo-600" : "bg-red-50 text-red-500"}`}>
                      {row.allTimeRoi >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {row.allTimeRoi.toFixed(0)}%
                    </span>
                  ) : <span className="text-gray-200 text-xs">—</span>}
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