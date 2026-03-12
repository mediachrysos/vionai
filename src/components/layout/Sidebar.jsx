import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, Bot, CreditCard,
  ChevronLeft, ChevronRight, LogOut,
  Menu, X, UserCircle, ShieldCheck, BarChart2
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Přehled", icon: LayoutDashboard, page: "Dashboard" },
  { name: "Zákazníci", icon: Users, page: "Customers" },
  { name: "Modelky", icon: Bot, page: "Models" },
  { name: "Platby", icon: CreditCard, page: "Payments" },
  { name: "Finance", icon: BarChart2, page: "Finance" },
  { name: "Admin Portál", icon: ShieldCheck, page: "AdminUsers" },
];

const chatterNav = [
  { name: "Můj přehled", icon: LayoutDashboard, page: "ChatterPortal" },
  { name: "Zákazníci", icon: Users, page: "Customers" },
  { name: "Platby", icon: CreditCard, page: "Payments" },
];

export default function Sidebar({ currentPage, user, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = user?.role === "admin";
  const items = isAdmin ? navItems : chatterNav;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center h-16 px-5 border-b border-gray-100",
        collapsed && "justify-center px-3"
      )}>
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#C9A227] to-[#A8841C] flex items-center justify-center shadow-sm shadow-amber-200">
              <span className="text-white text-xs font-bold tracking-tight">C</span>
            </div>
            <span className="font-semibold text-gray-900 text-base tracking-tight">Chrisos Media</span>
          </div>
        ) : (
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#C9A227] to-[#A8841C] flex items-center justify-center shadow-sm shadow-amber-200">
            <span className="text-white text-xs font-bold">C</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-5 px-3 space-y-0.5">
        {items.map((item) => {
          const isActive = currentPage === item.page ||
            (item.page === "Dashboard" && currentPage === "Home");
          return (
            <Link
              key={item.name}
              to={createPageUrl(item.page)}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-[#faf6e6] text-[#C9A227] shadow-sm shadow-amber-100"
                  : "text-gray-500 hover:text-[#C9A227] hover:bg-[#faf6e6]/70",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-[#C9A227]" : "text-gray-400")} />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className={cn("p-3 border-t border-gray-100", collapsed && "px-2")}>
        <div className={cn(
          "flex items-center gap-3 px-2 py-2 rounded-lg",
          collapsed && "justify-center px-0"
        )}>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-100 to-yellow-50 flex items-center justify-center flex-shrink-0">
            <UserCircle className="w-4 h-4 text-[#C9A227]" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{user?.full_name || "Uživatel"}</p>
              <p className="text-[11px] text-gray-400 truncate">{isAdmin ? "Admin" : "Chatter"}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={onLogout}
              className="text-gray-300 hover:text-[#C9A227] transition-colors p-1 rounded"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex items-center justify-center h-9 border-t border-gray-100 text-gray-300 hover:text-[#C9A227] transition-colors hover:bg-[#faf6e6]/60"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white border border-gray-200 text-gray-700 shadow-sm"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
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
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="lg:hidden fixed left-0 top-0 bottom-0 w-[240px] bg-white border-r border-gray-100 z-50 shadow-xl"
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 p-1"
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col bg-white border-r border-gray-100 h-screen sticky top-0 transition-all duration-300 ease-out",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}>
        <SidebarContent />
      </aside>
    </>
  );
}