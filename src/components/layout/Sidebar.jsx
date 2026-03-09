import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, Bot, CreditCard, ListTodo,
  ChevronLeft, ChevronRight, Search, LogOut, Settings,
  Menu, X, UserCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
  { name: "Customers", icon: Users, page: "Customers" },
  { name: "Models", icon: Bot, page: "Models" },
  { name: "Payments", icon: CreditCard, page: "Payments" },
  { name: "Tasks", icon: ListTodo, page: "Tasks" },
];

const chatterNav = [
  { name: "My Dashboard", icon: LayoutDashboard, page: "ChatterPortal" },
  { name: "Customers", icon: Users, page: "Customers" },
  { name: "Payments", icon: CreditCard, page: "Payments" },
  { name: "Tasks", icon: ListTodo, page: "Tasks" },
];

export default function Sidebar({ currentPage, user, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = user?.role === "admin";
  const items = isAdmin ? navItems : chatterNav;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn("flex items-center h-16 px-4 border-b border-slate-800/50", collapsed && "justify-center")}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Bot className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-semibold text-white text-lg tracking-tight">AgencyOS</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Bot className="w-4.5 h-4.5 text-white" />
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {items.map((item) => {
          const isActive = currentPage === item.page || 
            (item.page === "Dashboard" && currentPage === "Home");
          return (
            <Link
              key={item.name}
              to={createPageUrl(item.page)}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-indigo-500/20 text-indigo-300"
                  : "text-slate-400 hover:text-white hover:bg-white/5",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-indigo-400")} />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className={cn("p-3 border-t border-slate-800/50", collapsed && "px-2")}>
        <div className={cn("flex items-center gap-3 px-3 py-2", collapsed && "justify-center px-0")}>
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
            <UserCircle className="w-5 h-5 text-slate-400" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.full_name || "User"}</p>
              <p className="text-xs text-slate-500 truncate">{isAdmin ? "Admin" : "Chatter"}</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={onLogout} className="text-slate-500 hover:text-white transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Collapse toggle - desktop only */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex items-center justify-center h-10 border-t border-slate-800/50 text-slate-500 hover:text-white transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-900 text-white shadow-lg"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="lg:hidden fixed left-0 top-0 bottom-0 w-[260px] bg-slate-950 z-50"
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-slate-950 h-screen sticky top-0 transition-all duration-300",
          collapsed ? "w-[72px]" : "w-[240px]"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}