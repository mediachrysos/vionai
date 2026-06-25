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
    staleTime: 60000
  });

  const { data: models = [] } = useQuery({
    queryKey: ["models"],
    queryFn: () => base44.entities.Model.list(),
    staleTime: 120000
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
    [...payments].
    sort((a, b) => {
      const da = a.payment_date || a.created_date?.split("T")[0] || "";
      const db = b.payment_date || b.created_date?.split("T")[0] || "";
      return da > db ? 1 : -1;
    }).
    forEach((p) => {
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
        return spend > 0 ? (revenue - spend) / spend * 100 : null;
      }).filter((r) => r !== null);
      allTimeRoiByModel[m.id] = dailyRois.length > 0 ? dailyRois.reduce((s, r) => s + r, 0) / dailyRois.length : null;
    });

    // === TODAY ===
    const spendByModel = {};
    adSpends.
    filter((a) => a.date === date).
    forEach((a) => {
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
      Object.values(firstPaymentByCustomerModel).
      filter((p) => (p.payment_date || p.created_date?.split("T")[0]) === date).
      map((p) => `${p.customer_id}__${p.model_id}`)
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
        roi: d.adSpend > 0 ? (d.revenue - d.adSpend) / d.adSpend * 100 : null,
        allTimeRoi: allTimeRoiByModel[modelId] ?? null,
        cpc: d.newCustomers > 0 ? d.adSpend / d.newCustomers : null,
        allTimeCpc: allTimeCpcByModel[modelId] ?? null,
        avgValue: d.newCustomers > 0 ? d.revenue / d.newCustomers : null,
        allTimeAvgValue: allTimeAvgValueByModel[modelId] ?? null,
        profitPerCustomer: d.newCustomers > 0 && d.newCustomers > 0 ? d.revenue / d.newCustomers - d.adSpend / d.newCustomers : null,
        allTimeProfitPerCustomer: allTimeAvgValueByModel[modelId] !== null && allTimeCpcByModel[modelId] !== null ? allTimeAvgValueByModel[modelId] - allTimeCpcByModel[modelId] : null
      };
    }).
    filter(Boolean).
    sort((a, b) => a.modelName.localeCompare(b.modelName, "cs"));

    const totals = rows.reduce(
      (acc, r) => ({ adSpend: acc.adSpend + r.adSpend, revenue: acc.revenue + r.revenue, newCustomers: acc.newCustomers + r.newCustomers }),
      { adSpend: 0, revenue: 0, newCustomers: 0 }
    );
    const totalRoi = totals.adSpend > 0 ? (totals.revenue - totals.adSpend) / totals.adSpend * 100 : null;

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
      </div>);

  }

  return null;



















































































































































































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
    </div>);

}