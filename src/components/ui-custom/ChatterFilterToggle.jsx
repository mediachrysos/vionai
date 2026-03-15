import React from "react";
import { Users, User } from "lucide-react";

/**
 * A small toggle to switch between "My data" (default) and "All data".
 * Saves preference to localStorage under key "chatterFilterAll".
 */
export function useChatterFilter() {
  const [showAll, setShowAll] = React.useState(() => {
    try { return localStorage.getItem("chatterFilterAll") === "true"; }
    catch { return false; }
  });

  const toggle = (val) => {
    setShowAll(val);
    try { localStorage.setItem("chatterFilterAll", String(val)); } catch {}
  };

  return { showAll, toggle };
}

export default function ChatterFilterToggle({ showAll, onToggle, className = "" }) {
  return (
    <div className={`inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 gap-0.5 ${className}`}>
      <button
        onClick={() => onToggle(false)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          !showAll
            ? "bg-white shadow-sm text-gray-800 border border-gray-200"
            : "text-gray-400 hover:text-gray-600"
        }`}
      >
        <User className="w-3 h-3" />
        Moje data
      </button>
      <button
        onClick={() => onToggle(true)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
          showAll
            ? "bg-white shadow-sm text-gray-800 border border-gray-200"
            : "text-gray-400 hover:text-gray-600"
        }`}
      >
        <Users className="w-3 h-3" />
        Vše
      </button>
    </div>
  );
}