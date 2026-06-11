import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, TrendingUp, CreditCard, Layers,
  MessageSquare, Settings, Search, LogOut, ChevronLeft,
  ChevronRight, Menu, X, ScanSearch
} from "lucide-react";
import { cn } from "@/lib/utils";

const allPages = [
  { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
  { name: "Customers", icon: Users, page: "Customers" },
  { name: "Look-alike Audience", icon: ScanSearch, page: "LookAlikeAudience" },
  { name: "Finance", icon: TrendingUp, page: "Finance" },
  { name: "Wallet", icon: CreditCard, page: "Wallet" },
  { name: "Graphic Space", icon: Layers, page: "SocialMediaContent" },
  { name: "Chatting Space", icon: MessageSquare, page: "ChatterPortal" },
  { name: "Admin Portal", icon: Settings, page: "AdminUsers" },
  { name: "Customer Scraper", icon: Search, page: "CustomerScraper" },
];

const defaultChatterPages = ["ChatterPortal", "Customers"];
const defaultLawyerPages = ["Finance"];

export default function Sidebar({ currentPage, user, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
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
    if (isChatter || isDesigner) {
      ["ChatterPortal", "Customers"].forEach(p => pageSet.add(p));
    }
    if (isDesigner) pageSet.add("SocialMediaContent");
    if (pageSet.size === 0) {
      ["ChatterPortal", "Customers"].forEach(p => pageSet.add(p));
    }
    items = allPages.filter(p => pageSet.has(p.page));
  }

  const roleLabel = isAdmin ? "Admin" : isLawyer ? "Lawyer" : isDesigner ? "Designer" : "Chatter";
  const initials = user?.full_name
    ? user.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 h-16 px-5 overflow-hidden",
        collapsed && "justify-center px-3"
      )}>
        {!collapsed ? (
          <img
            src="https://res.cloudinary.com/drkudvyog/image/upload/v1774274783/Chrysos_Media_Logo_gmfbds.png"
            alt="Chrysos Media"
            className="h-8 w-auto object-contain brightness-200"
          />
        ) : (
          <img
            src="https://res.cloudinary.com/drkudvyog/image/upload/v1774274783/Chrysos_Media_Logo_gmfbds.png"
            alt="Chrysos Media"
            className="h-7 w-7 object-contain brightness-200"
          />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
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
                "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5",
                collapsed && "justify-center px-2"
              )}
            >
              <Icon className={cn(
                "flex-shrink-0",
                collapsed ? "w-5 h-5" : "w-4 h-4",
                isActive ? "text-[#C9A227]" : "text-slate-500"
              )} />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className={cn("px-3 py-3 border-t border-white/10", collapsed && "px-2")}>
        <div className={cn(
          "flex items-center gap-3",
          collapsed && "justify-center"
        )}>
          <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-slate-200">{initials}</span>
          </div>
          {!collapsed && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex items-center justify-center h-8 border-t border-white/10 text-slate-600 hover:text-slate-400 transition-colors hover:bg-white/5"
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
            className="lg:hidden fixed left-0 top-0 bottom-0 w-[240px] bg-[#161616] border-r border-white/10 z-50 shadow-2xl relative"
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 p-1"
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col bg-[#161616] border-r border-white/10 h-screen sticky top-0 transition-all duration-300 ease-out relative",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}>
        <SidebarContent />
      </aside>
    </>
  );
}