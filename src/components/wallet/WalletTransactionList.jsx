import React from "react";
import { format } from "date-fns";
import { TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function WalletTransactionList({ transactions }) {
  if (!transactions.length) {
    return (
      <div className="text-center py-10 text-sm text-gray-400">Zatím žádné transakce</div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((tx, i) => {
        const isIncome = tx.type === "income";
        return (
          <div key={tx.id || i} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white border border-[#ececec] hover:border-[#e8d99a] transition-colors">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isIncome ? "bg-emerald-50" : "bg-red-50"}`}>
                {isIncome
                  ? <ArrowUpCircle className="w-4 h-4 text-emerald-600" />
                  : <ArrowDownCircle className="w-4 h-4 text-red-500" />
                }
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{tx.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-gray-400">
                    {tx.transaction_date
                      ? format(new Date(tx.transaction_date), "d. M. yyyy")
                      : tx.created_date
                        ? format(new Date(tx.created_date), "d. M. yyyy")
                        : "—"}
                  </p>
                  {tx.category && <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0">{tx.category}</Badge>}
                  {tx.account_name && <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 bg-amber-50 border-amber-200 text-amber-700">{tx.account_name}</Badge>}
                  {tx.source && <Badge variant="outline" className="text-[10px] h-4 px-1.5 py-0 bg-blue-50 border-blue-200 text-blue-700">{tx.source}</Badge>}
                </div>
              </div>
            </div>
            <p className={`text-base font-bold flex-shrink-0 ${isIncome ? "text-emerald-700" : "text-red-600"}`}>
              {isIncome ? "+" : "–"}{(tx.amount || 0).toLocaleString("cs-CZ")} Kč
            </p>
          </div>
        );
      })}
    </div>
  );
}