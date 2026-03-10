import React from "react";
import { Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function GoalWidget({ monthlyRevenue, goal = 50000 }) {
  const pct = Math.min(100, Math.round((monthlyRevenue / goal) * 100));
  const remaining = Math.max(0, goal - monthlyRevenue);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-5">
        <Target className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-800">Měsíční cíl</h3>
        <span className="ml-auto text-xs font-semibold text-gray-900">{pct}%</span>
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-2xl font-semibold text-gray-900 tracking-tight">${monthlyRevenue.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-0.5">z ${goal.toLocaleString()} měsíčního cíle</p>
        </div>
        <Progress value={pct} className="h-1.5 bg-gray-100" />
        {remaining > 0 && (
          <p className="text-xs text-gray-400">Zbývá <span className="text-gray-700 font-medium">${remaining.toLocaleString()}</span></p>
        )}
        {remaining === 0 && (
          <p className="text-xs text-emerald-600 font-medium">Cíl splněn! 🎉</p>
        )}
      </div>
    </div>
  );
}