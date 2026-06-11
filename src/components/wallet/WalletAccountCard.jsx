import React from "react";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WalletAccountCard({ account, onEdit, onDelete, walletTxs = [] }) {
  const accountTxs = walletTxs.filter(t => t.account_id === account.id);
  const totalIncome = accountTxs.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpense = accountTxs.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);

  return (
    <div className="bg-[#1e1e1e] rounded-2xl border border-white/10 shadow-[0_6px_20px_rgba(0,0,0,0.3)] p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-[#C9A227] to-[#A8841C] flex items-center justify-center shadow-sm shadow-amber-200">
            {account.profile_photo
              ? <img src={account.profile_photo} alt={account.name} className="w-full h-full object-cover" />
              : <Wallet className="w-5 h-5 text-white" />
            }
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">{account.name}</p>
            <p className="text-xs text-slate-500">
              {account.account_number}{account.bank_name ? ` · ${account.bank_name}` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(account)}>
            <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774303157/Chrysos_icon_24_aobpbn.png" alt="edit" className="w-3.5 h-3.5 object-contain" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDelete(account)}>
            <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774303157/Chrysos_icon_25_qzhwnb.png" alt="delete" className="w-3.5 h-3.5 object-contain" />
          </Button>
        </div>
      </div>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Zůstatek</p>
        <p className={`text-2xl font-bold ${account.balance >= 0 ? "text-slate-100" : "text-red-500"}`}>
          {(account.balance || 0).toLocaleString("cs-CZ")} {account.currency || "Kč"}
        </p>
      </div>
      {(totalIncome > 0 || totalExpense > 0) && (
        <div className="flex gap-3 border-t border-white/10 pt-3">
          {totalIncome > 0 && (
            <div className="flex-1">
              <p className="text-xs text-slate-500 mb-0.5">Příjmy</p>
              <p className="text-sm font-semibold text-emerald-600">+{totalIncome.toLocaleString("cs-CZ")} Kč</p>
            </div>
          )}
          {totalExpense > 0 && (
            <div className="flex-1">
              <p className="text-xs text-slate-500 mb-0.5">Výdaje</p>
              <p className="text-sm font-semibold text-red-500">-{totalExpense.toLocaleString("cs-CZ")} Kč</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}