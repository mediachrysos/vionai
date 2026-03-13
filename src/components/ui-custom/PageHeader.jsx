import React from "react";

export default function PageHeader({ title, subtitle, children, goalCurrent, goalTarget = 50000 }) {
  const showGoal = goalCurrent !== undefined && goalCurrent !== null;
  const pct = showGoal ? Math.min(100, Math.round(goalCurrent / goalTarget * 100)) : 0;

  return (
    <div className="flex flex-col gap-3 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {children && <div className="flex items-center gap-2 flex-wrap">{children}</div>}
      </div>
      



















    </div>);

}