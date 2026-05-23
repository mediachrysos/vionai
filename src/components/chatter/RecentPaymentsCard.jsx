import React from "react";
import { CreditCard } from "lucide-react";
import { format } from "date-fns";

function getPaymentTag(payment, allPaymentsForCustomer) {
  const prev = allPaymentsForCustomer.filter((p) => p.customer_id === payment.customer_id && p.id !== payment.id);
  if (payment.amount >= 5000) return { label: "High value", cls: "bg-amber-50 text-[#C9A227] border border-[#e8d99a]" };
  if (prev.length === 0) return { label: "First payment", cls: "bg-emerald-50 text-emerald-600 border border-emerald-200" };
  return { label: "Repeat buyer", cls: "bg-gray-100 text-gray-500" };
}

export default function RecentPaymentsCard({ payments, title = "Poslední platby" }) {
  if (!payments || payments.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_4px_16px_rgba(0,0,0,0.05)] p-6 mb-4">
        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[#C9A227]" /> {title}
        </h3>
        <p className="text-sm text-gray-400 text-center py-6">Zatím žádné platby</p>
      </div>);

  }

  return null;


























}