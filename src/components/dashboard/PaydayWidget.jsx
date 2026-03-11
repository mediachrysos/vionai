import React from "react";
import { CalendarDays } from "lucide-react";

export default function PaydayWidget({ customers, models = [], currentUser }) {
  const todayDay = new Date().getDate();

  const payingToday = customers.filter(
    (c) => c.pay_day_of_month === todayDay && c.status !== "blocked" && c.status !== "inactive"
  );

  // For chatters: only show customers linked to their assigned models
  const isChatter = currentUser?.role === "chatter";
  const assignedModelIds = currentUser?.assigned_model_ids || [];

  const visible = isChatter
    ? payingToday.filter((c) => assignedModelIds.includes(c.assigned_model))
    : payingToday;

  if (visible.length === 0) return null;

  // Group by model
  const modelMap = {};
  visible.forEach((c) => {
    const modelId = c.assigned_model || "none";
    const model = models.find((m) => m.id === modelId);
    const modelName = model?.name || "Bez modelky";
    if (!modelMap[modelName]) modelMap[modelName] = [];
    modelMap[modelName].push(c);
  });

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-5 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
          <CalendarDays className="w-3.5 h-3.5 text-amber-600" />
        </div>
        <h3 className="text-sm font-semibold text-amber-800">
          Dnes mají výplatu ({visible.length})
        </h3>
      </div>

      <div className="space-y-3">
        {Object.entries(modelMap).map(([modelName, custs]) => (
          <div key={modelName}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500 mb-1.5">
              {modelName}
            </p>
            <div className="flex flex-wrap gap-2">
              {custs.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-1.5 bg-white border border-amber-200 rounded-lg px-3 py-1.5 shadow-sm"
                >
                  <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-[10px] font-bold text-amber-700">
                    {c.full_name?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-xs font-semibold text-amber-900">{c.full_name}</span>
                  {c.total_spent > 0 && (
                    <span className="text-[10px] text-amber-500 ml-1">
                      {c.total_spent.toLocaleString()} Kč
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}