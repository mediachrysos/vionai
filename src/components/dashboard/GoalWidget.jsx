import React from "react";
import { Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function GoalWidget({ monthlyRevenue, goal = 50000 }) {
  const pct = Math.min(100, Math.round((monthlyRevenue / goal) * 100));
  const remaining = Math.max(0, goal - monthlyRevenue);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 hover:border-indigo-100 transition-colors">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
          <Target className="w-3.5 h-3.5 text-violet-500" />
        </div>
        <h3 className="text-sm font-semibold text-gray-800">Měsíční cíl</h3>
        <span className="ml-auto text-xs font-semibold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{pct}%</span>
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-2xl font-semibold text-gray-900 tracking-tight">${monthlyRevenue.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-0.5">z ${goal.toLocaleString()} měsíčního cíle</p>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        {remaining > 0 && (
          <p className="text-xs text-gray-400">Zbývá <span className="text-indigo-600 font-medium">${remaining.toLocaleString()}</span></p>
        )}
        {remaining === 0 && (
          <p className="text-xs text-emerald-600 font-medium">Cíl splněn! 🎉</p>
        )}
      </div>
    </div>
  );
}