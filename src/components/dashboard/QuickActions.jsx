import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { UserPlus, CreditCard, Bot, ListPlus } from "lucide-react";

const actions = [
  { label: "Přidat zákazníka", icon: UserPlus, page: "Customers", params: "?action=new" },
  { label: "Přidat platbu", icon: CreditCard, page: "Payments", params: "?action=new" },
  { label: "Přidat modelku", icon: Bot, page: "Models", params: "?action=new" },
  { label: "Přidat úkol", icon: ListPlus, page: "Tasks", params: "?action=new" },
];

export default function QuickActions() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {actions.map(a => (
        <Link
          key={a.label}
          to={createPageUrl(a.page) + a.params}
          className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-150 group"
        >
          <div className="w-8 h-8 rounded-lg bg-gray-50 group-hover:bg-gray-100 flex items-center justify-center transition-colors flex-shrink-0">
            <a.icon className="w-4 h-4 text-gray-500" />
          </div>
          <span className="text-xs font-medium text-gray-600 group-hover:text-gray-900 transition-colors">{a.label}</span>
        </Link>
      ))}
    </div>
  );
}