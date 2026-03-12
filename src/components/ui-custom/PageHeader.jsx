import React from "react";

export default function PageHeader({ title, subtitle, children, goalCurrent, goalTarget = 50000 }) {
  const showGoal = goalCurrent !== undefined && goalCurrent !== null;
  const pct = showGoal ? Math.min(100, Math.round((goalCurrent / goalTarget) * 100)) : 0;

  return (
    <div className="flex flex-col gap-3 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
      </div>
      {showGoal && (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Měsíční cíl</span>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">
            {goalCurrent >= goalTarget
              ? <span className="text-emerald-600">Cíl splněn! 🎉</span>
              : <>{goalCurrent.toLocaleString()} Kč <span className="text-gray-400 font-normal">/ {goalTarget.toLocaleString()} Kč</span></>
            }
          </span>
          <span className="text-xs font-semibold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{pct}%</span>
        </div>
      )}
    </div>
  );
}