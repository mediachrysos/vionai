import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, TrendingUp, CreditCard, Layers,
  MessageSquare, Settings, Search, LogOut, Menu, X
} from "lucide-react";
import { cn } from "@/lib/utils";

const allPages = [
  { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
  { name: "Customers", icon: Users, page: "Customers" },
  { name: "Finance", icon: TrendingUp, page: "Finance" },
  { name: "Wallet", icon: CreditCard, page: "Wallet" },
  { name: "Graphic Space", icon: Layers, page: "SocialMediaContent" },
  { name: "Chatting Space", icon: MessageSquare, page: "ChatterPortal" },
  { name: "Admin Portal", icon: Settings, page: "AdminUsers" },
  { name: "Customer Scraper", icon: Search, page: "CustomerScraper" },
];

const defaultLawyerPages = ["Finance"];

export default function Sidebar({ currentPage, user, onLogout }) {
  const [hovered, setHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const userRoles = user?.roles?.length > 0 ? user.roles : (user?.role ? [user.role] : []);
  const isAdmin = userRoles.includes("admin");
  const isLawyer = userRoles.includes("lawyer");
  const isChatter = userRoles.includes("chatter");
  const isDesigner = userRoles.includes("grafik");

  let items;
  if (isAdmin) {
    items = allPages;
  } else if (user?.allowed_pages?.length > 0) {
    items = allPages.filter(p => user.allowed_pages.includes(p.page));
  } else {
    const pageSet = new Set();
    if (isLawyer) defaultLawyerPages.forEach(p => pageSet.add(p));
    if (isChatter || isDesigner) ["ChatterPortal", "Customers"].forEach(p => pageSet.add(p));
    if (isDesigner) pageSet.add("SocialMediaContent");
    if (pageSet.size === 0) ["ChatterPortal", "Customers"].forEach(p => pageSet.add(p));
    items = allPages.filter(p => pageSet.has(p.page));
  }

  const roleLabel = isAdmin ? "Admin" : isLawyer ? "Lawyer" : isDesigner ? "Designer" : "Chatter";
  const initials = user?.full_name
    ? user.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const expanded = hovered;

  const SidebarInner = ({ forMobile = false }) => (
    <div className="flex flex-col h-full overflow-hidden">

      {/* User — top */}
      <div className={cn(
        "border-b border-white/10 py-3 transition-all duration-300 flex-shrink-0",
        (expanded || forMobile) ? "px-3" : "px-2"
      )}>
        <div className={cn("flex items-center gap-3", !(expanded || forMobile) && "justify-center")}>
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-slate-200">{initials}</span>
          </div>
          <div className={cn(
            "flex items-center gap-2 flex-1 min-w-0 transition-all duration-200",
            (expanded || forMobile) ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
          )}>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">{user?.full_name || "User"}</p>
              <p className="text-[11px] text-slate-500 truncate">{roleLabel}</p>
            </div>
            <button
              onClick={onLogout}
              className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded flex-shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const isActive = currentPage === item.page ||
            (item.page === "Dashboard" && currentPage === "Home");
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={createPageUrl(item.page)}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "relative flex items-center gap-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200 hover:bg-white/5",
                (expanded || forMobile) ? "px-3" : "px-0 justify-center"
              )}
            >
              <Icon className={cn("flex-shrink-0 w-5 h-5", isActive ? "text-[#C9A227]" : "text-slate-500")} />
              <span className={cn(
                "whitespace-nowrap transition-all duration-200",
                (expanded || forMobile) ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 shadow-sm"
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
            className="lg:hidden fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
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
            className="lg:hidden fixed left-0 top-0 bottom-0 w-[240px] bg-[#161616] border-r border-white/10 z-50 shadow-2xl"
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 p-1"
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarInner forMobile />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar — fixed, collapsed by default, hover to expand */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "hidden lg:flex flex-col fixed left-0 top-0 bottom-0 bg-[#161616] border-r border-white/10 z-40 transition-all duration-300 ease-out",
          hovered ? "w-[220px] shadow-2xl shadow-black/40" : "w-[60px]"
        )}
      >
        <SidebarInner />
      </aside>

      {/* Spacer */}
      <div className="hidden lg:block flex-shrink-0 w-[60px]" />
    </>
  );
}