import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function CollapsibleSection({ title, children }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between bg-[#1e1e1e] rounded-2xl border border-white/10 shadow-[0_6px_20px_rgba(0,0,0,0.3)] p-5 hover:border-white/20 transition-colors text-left"
      >
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
        <ChevronDown className="w-4 h-4 text-slate-500" />
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(false)}
        className="w-full flex items-center justify-center bg-[#1e1e1e] rounded-t-2xl border border-b-0 border-white/10 px-5 py-1.5 hover:bg-white/5 transition-colors"
        title="Collapse"
      >
        <ChevronUp className="w-4 h-4 text-slate-500" />
      </button>
      <div className="[&>*]:rounded-t-none">
        {children}
      </div>
    </div>
  );
}