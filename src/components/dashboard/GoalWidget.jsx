import React from "react";
import { Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function GoalWidget({ monthlyRevenue, goal = 50000 }) {
  const pct = Math.min(100, Math.round((monthlyRevenue / goal) * 100));
  const remaining = Math.max(0, goal - monthlyRevenue);

  return (
    <div className="bg-[#1e1e1e] rounded-xl border border-white/10 p-5 hover:border-violet-700/30 transition-colors">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-7 h-7 rounded-lg bg-violet-950/50 flex items-center justify-center">
          <Target className="w-3.5 h-3.5 text-violet-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-200">Monthly goal</h3>
        <span className="ml-auto text-xs font-semibold bg-violet-950/50 text-violet-300 border border-violet-700/30 px-2 py-0.5 rounded-full">{pct}%</span>
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-2xl font-semibold text-slate-100 tracking-tight">${monthlyRevenue.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-0.5">of ${goal.toLocaleString()} monthly goal</p>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        {remaining > 0 && (
           <p className="text-xs text-slate-500">Remaining <span className="text-violet-400 font-medium">${remaining.toLocaleString()}</span></p>
         )}
         {remaining === 0 && (
           <p className="text-xs text-emerald-400 font-medium">Goal reached! 🎉</p>
         )}
      </div>
    </div>
  );
}