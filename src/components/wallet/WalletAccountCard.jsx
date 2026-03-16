import React from "react";
import { Pencil, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WalletAccountCard({ account, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9A227] to-[#A8841C] flex items-center justify-center shadow-sm shadow-amber-200">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{account.name}</p>
            {account.description && (
              <p className="text-xs text-gray-400">{account.description}</p>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(account)}>
            <Pencil className="w-3.5 h-3.5 text-gray-400" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDelete(account)}>
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </Button>
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Zůstatek</p>
        <p className={`text-2xl font-bold ${account.balance >= 0 ? "text-gray-900" : "text-red-600"}`}>
          {(account.balance || 0).toLocaleString("cs-CZ")} {account.currency || "Kč"}
        </p>
      </div>
    </div>
  );
}