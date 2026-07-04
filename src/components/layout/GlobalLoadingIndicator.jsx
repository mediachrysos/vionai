import React from "react";
import { useIsFetching } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export default function GlobalLoadingIndicator() {
  const isFetching = useIsFetching();

  if (!isFetching) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex items-center gap-2 bg-[#1e1e1e] border border-[#C9A227]/30 rounded-full px-3 py-2 shadow-lg">
      <Loader2 className="w-4 h-4 text-[#C9A227] animate-spin" />
      <span className="text-xs text-slate-300">Loading...</span>
    </div>
  );
}