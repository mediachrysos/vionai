import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { UserPlus, CreditCard, Bot, ListPlus } from "lucide-react";

const actions = [
  { label: "Přidat zákazníka", icon: UserPlus, page: "Customers", params: "?action=new", color: "bg-indigo-50 text-indigo-500 group-hover:bg-indigo-100" },
  { label: "Přidat platbu", icon: CreditCard, page: "Payments", params: "?action=new", color: "bg-violet-50 text-violet-500 group-hover:bg-violet-100" },
  { label: "Přidat modelku", icon: Bot, page: "Models", params: "?action=new", color: "bg-blue-50 text-blue-500 group-hover:bg-blue-100" },
  { label: "Přidat úkol", icon: ListPlus, page: "Tasks", params: "?action=new", color: "bg-purple-50 text-purple-500 group-hover:bg-purple-100" },
];

export default function QuickActions() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      {actions.map(a => (
        <Link
          key={a.label}
          to={createPageUrl(a.page) + a.params}
          className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 hover:border-indigo-100 hover:shadow-sm hover:shadow-indigo-50 transition-all duration-150 group"
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${a.color}`}>
            <a.icon className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-gray-600 group-hover:text-indigo-700 transition-colors">{a.label}</span>
        </Link>
      ))}
    </div>
  );
}