import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, TrendingUp, CreditCard, Layers,
  MessageSquare, Settings, LogOut, Menu, X, Sun, Moon, Clock, Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/lib/ThemeContext";

const allPages = [
  { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
  { name: "Customers", icon: Users, page: "Customers" },
  { name: "Finance", icon: TrendingUp, page: "Finance" },
  { name: "Wallet", icon: CreditCard, page: "Wallet" },
  { name: "Graphic Space", icon: Layers, page: "SocialMediaContent" },
  { name: "Chatting Space", icon: MessageSquare, page: "ChatterPortal" },
  { name: "Admin Portal", icon: Settings, page: "AdminUsers" },
];

const defaultLawyerPages = ["Finance"];

export default function Sidebar({ currentPage, user, onLogout }) {
  const [hovered, setHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const { theme, toggleTheme, schedule, setSchedule } = useTheme();

  const userRoles = user?.roles?.length > 0 ? user.roles : (user?.role ? [user.role] : []);
  const isAdmin = userRoles.includes("admin");
  const isLawyer = userRoles.includes("lawyer");
  const isChatter = userRoles.includes("chatter");
  const isDesigner = userRoles.includes("grafik");

  const isSuperAdmin = isAdmin && !user?.space_id;

  let items;
  if (isAdmin) {
    items = [
      ...allPages,
      ...(isSuperAdmin ? [{ name: "All Spaces", icon: Globe, page: "SuperAdminSpaces" }] : []),
    ];
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
            <div key={item.name}>
              <Link
                to={createPageUrl(item.page)}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "relative flex items-center gap-3 py-1 rounded-lg text-sm font-medium transition-all duration-150",
                  isActive ? "text-white" : "text-slate-400 hover:text-slate-200",
                  (expanded || forMobile) ? "px-3" : "px-0 justify-center"
                )}
              >
                <span className={cn(
                  "flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0 transition-colors",
                  isActive ? "bg-white/10" : "hover:bg-white/5"
                )}>
                  <Icon className={cn("w-5 h-5", isActive ? "text-[#C9A227]" : "text-slate-500")} />
                </span>
                <span className={cn(
                  "whitespace-nowrap transition-all duration-200",
                  (expanded || forMobile) ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"
                )}>
                  {item.name}
                </span>
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Theme toggle — bottom */}
      <div className={cn("border-t border-white/10 py-3 flex-shrink-0", (expanded || forMobile) ? "px-3" : "px-2")}>
        {/* Toggle row */}
        <div className={cn("flex items-center gap-2", !(expanded || forMobile) && "justify-center")}>
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors flex-shrink-0"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark"
              ? <Sun className="w-4 h-4 text-[#C9A227]" />
              : <Moon className="w-4 h-4 text-slate-500" />}
          </button>
          {(expanded || forMobile) && (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <span className="text-xs text-slate-400 flex-1 truncate">
                {theme === "dark" ? "Dark mode" : "Light mode"}
              </span>
              <button
                onClick={() => setShowSchedule(s => !s)}
                className="p-1 rounded hover:bg-white/5 transition-colors"
                title="Schedule"
              >
                <Clock className={cn("w-3.5 h-3.5", schedule.enabled ? "text-[#C9A227]" : "text-slate-600")} />
              </button>
            </div>
          )}
        </div>

        {/* Schedule panel */}
        {(expanded || forMobile) && showSchedule && (
          <div className="mt-2 bg-black/20 rounded-xl p-3 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setSchedule(s => ({ ...s, enabled: !s.enabled }))}
                className={cn(
                  "w-8 h-4 rounded-full relative transition-colors cursor-pointer flex-shrink-0",
                  schedule.enabled ? "bg-[#C9A227]" : "bg-white/10"
                )}
              >
                <div className={cn(
                  "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
                  schedule.enabled ? "left-[18px]" : "left-0.5"
                )} />
              </div>
              <span className="text-xs text-slate-400">Auto schedule</span>
            </label>

            {schedule.enabled && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2">
                  <Sun className="w-3 h-3 text-[#C9A227] flex-shrink-0" />
                  <span className="text-[10px] text-slate-500 w-12">Light from</span>
                  <input
                    type="time"
                    value={schedule.lightFrom}
                    onChange={e => setSchedule(s => ({ ...s, lightFrom: e.target.value }))}
                    className="text-[10px] bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-slate-300 w-20"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Moon className="w-3 h-3 text-slate-500 flex-shrink-0" />
                  <span className="text-[10px] text-slate-500 w-12">Dark from</span>
                  <input
                    type="time"
                    value={schedule.darkFrom}
                    onChange={e => setSchedule(s => ({ ...s, darkFrom: e.target.value }))}
                    className="text-[10px] bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-slate-300 w-20"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
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