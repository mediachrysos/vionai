import React from "react";
import { Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function GoalWidget({ monthlyRevenue, goal = 50000 }) {
  const pct = Math.min(100, Math.round((monthlyRevenue / goal) * 100));

  return (
    <div className="bg-white rounded-xl border border-slate-200/60 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-indigo-500" />
        <h3 className="text-sm font-semibold text-slate-700">Monthly Goal</h3>
      </div>
      <div className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold text-slate-900">${monthlyRevenue.toLocaleString()}</p>
            <p className="text-xs text-slate-400">of ${goal.toLocaleString()} target</p>
          </div>
          <span className="text-lg font-bold text-indigo-500">{pct}%</span>
        </div>
        <Progress value={pct} className="h-2.5" />
        <p className="text-xs text-slate-400">
          ${Math.max(0, goal - monthlyRevenue).toLocaleString()} remaining
        </p>
      </div>
    </div>
  );
}