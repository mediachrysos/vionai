import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { UserPlus, CreditCard, Bot, ListPlus } from "lucide-react";

const actions = [
  { label: "Add Customer", icon: UserPlus, page: "Customers", params: "?action=new", color: "bg-blue-50 text-blue-600" },
  { label: "Add Payment", icon: CreditCard, page: "Payments", params: "?action=new", color: "bg-emerald-50 text-emerald-600" },
  { label: "Add Model", icon: Bot, page: "Models", params: "?action=new", color: "bg-purple-50 text-purple-600" },
  { label: "Add Task", icon: ListPlus, page: "Tasks", params: "?action=new", color: "bg-amber-50 text-amber-600" },
];

export default function QuickActions() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {actions.map(a => (
        <Link
          key={a.label}
          to={createPageUrl(a.page) + a.params}
          className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-slate-200/60 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.color}`}>
            <a.icon className="w-5 h-5" />
          </div>
          <span className="text-xs font-medium text-slate-600">{a.label}</span>
        </Link>
      ))}
    </div>
  );
}