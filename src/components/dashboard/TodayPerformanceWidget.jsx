import React, { useMemo } from "react";

export default function TodayPerformanceWidget({ payments, chatters, models }) {
  const today = new Date().toISOString().split("T")[0];

  const todayPayments = useMemo(
    () => payments.filter(p => (p.payment_date || p.created_date?.split("T")[0]) === today),
    [payments, today]
  );

  // Per chatter
  const chatterStats = useMemo(() => {
    const map = {};
    todayPayments.forEach(p => {
      if (!p.chatter_email) return;
      if (!map[p.chatter_email]) {
        const user = chatters.find(c => c.email === p.chatter_email);
        map[p.chatter_email] = {
          name: user?.nickname || user?.full_name || p.chatter_name || p.chatter_email.split("@")[0],
          revenue: 0,
          count: 0
        };
      }
      map[p.chatter_email].revenue += p.amount || 0;
      map[p.chatter_email].count += 1;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [todayPayments, chatters]);

  // Per model
  const modelStats = useMemo(() => {
    const map = {};
    todayPayments.forEach(p => {
      if (!p.model_id && !p.model_name) return;
      const key = p.model_id || p.model_name;
      if (!map[key]) {
        const model = models.find(m => m.id === p.model_id);
        map[key] = {
          name: model?.name || p.model_name || "—",
          revenue: 0,
          count: 0
        };
      }
      map[key].revenue += p.amount || 0;
      map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [todayPayments, models]);

  const totalToday = todayPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const maxRevenue = Math.max(...chatterStats.map(c => c.revenue), ...modelStats.map(m => m.revenue), 1);

  return (
    <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-100">Today's Performance</h3>
          <p className="text-xs text-slate-500">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-[#C9A227]">{totalToday.toLocaleString()} CZK</p>
          <p className="text-xs text-slate-500">{todayPayments.length} payments</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10">
        {/* Chatters */}
        <div className="p-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Chatters</p>
          {chatterStats.length === 0 ? (
            <p className="text-xs text-slate-600 py-4 text-center">No chatter activity today</p>
          ) : (
            <div className="space-y-2.5">
              {chatterStats.map((c, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#C9A227]/20 flex items-center justify-center text-[9px] font-bold text-[#C9A227] flex-shrink-0">
                        {c.name[0]?.toUpperCase()}
                      </div>
                      <span className="text-xs text-slate-300 font-medium truncate max-w-[100px]">{c.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-100">{c.revenue.toLocaleString()} CZK</span>
                      <span className="text-[10px] text-slate-500 ml-1.5">×{c.count}</span>
                    </div>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#C9A227] to-[#e8c84a] rounded-full"
                      style={{ width: `${Math.round((c.revenue / maxRevenue) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Models */}
        <div className="p-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Models</p>
          {modelStats.length === 0 ? (
            <p className="text-xs text-slate-600 py-4 text-center">No model activity today</p>
          ) : (
            <div className="space-y-2.5">
              {modelStats.map((m, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-purple-500/20 flex items-center justify-center text-[9px] font-bold text-purple-400 flex-shrink-0">
                        {m.name[0]?.toUpperCase()}
                      </div>
                      <span className="text-xs text-slate-300 font-medium truncate max-w-[100px]">{m.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-100">{m.revenue.toLocaleString()} CZK</span>
                      <span className="text-[10px] text-slate-500 ml-1.5">×{m.count}</span>
                    </div>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                      style={{ width: `${Math.round((m.revenue / maxRevenue) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}