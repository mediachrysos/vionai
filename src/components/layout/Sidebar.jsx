import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, Bot,
  ChevronLeft, ChevronRight, LogOut,
  Menu, X, UserCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

const customIcons = {
  SocialMediaContent: "https://res.cloudinary.com/drkudvyog/image/upload/v1774266695/Chrysos_icon_17_kklr9x.png",
  Dashboard: "https://res.cloudinary.com/drkudvyog/image/upload/v1774266694/Chrysos_icon_15_tmcn0g.png",
  Models: "https://res.cloudinary.com/drkudvyog/image/upload/v1774266697/Chrysos_icon_10_cpk2ha.png",
  Finance: "https://res.cloudinary.com/drkudvyog/image/upload/v1774266695/Chrysos_icon_17_kklr9x.png",
  Wallet: "https://res.cloudinary.com/drkudvyog/image/upload/v1774266694/Chrysos_icon_16_gtkobz.png",
  AdminUsers: "https://res.cloudinary.com/drkudvyog/image/upload/v1774266698/Chrysos_icon_11_zdpyp3.png",
  CustomerScraper: "https://res.cloudinary.com/drkudvyog/image/upload/v1774266694/Chrysos_icon_13_up9fpo.png",
  Customers: "https://res.cloudinary.com/drkudvyog/image/upload/v1774300826/Chrysos_icon_19_jgrgx6.png",
  Payments: "https://res.cloudinary.com/drkudvyog/image/upload/v1774266694/Chrysos_icon_2_jqior6.png",
};

const allPages = [
  { name: "Dashboard", icon: null, page: "Dashboard" },
  { name: "Customers", icon: Users, page: "Customers" },
  { name: "Models", icon: null, page: "Models" },
  { name: "Finance", icon: null, page: "Finance" },
  { name: "Wallet", icon: null, page: "Wallet" },
  { name: "Social Media", icon: null, page: "SocialMediaContent" },
  { name: "Admin Portal", icon: null, page: "AdminUsers" },
  { name: "Customer Scraper", icon: null, page: "CustomerScraper" },
];

const defaultChatterPages = ["ChatterPortal", "Customers"];
const defaultLawyerPages = ["Finance"];

export default function Sidebar({ currentPage, user, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = user?.role === "admin";
  const isLawyer = user?.role === "lawyer";

  let items;
  if (isAdmin) {
    items = allPages;
  } else if (user?.allowed_pages?.length > 0) {
    // Custom permissions set by admin
    items = allPages.filter(p => user.allowed_pages.includes(p.page));
  } else if (isLawyer) {
    items = allPages.filter(p => defaultLawyerPages.includes(p.page));
  } else {
    // Default chatter nav
    const chatterPages = ["ChatterPortal", "Customers"];
    items = [
      { name: "My Overview", icon: LayoutDashboard, page: "ChatterPortal" },
      ...allPages.filter(p => chatterPages.includes(p.page) && p.page !== "ChatterPortal"),
    ];
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center h-16 px-5 border-b border-gray-100",
        collapsed && "justify-center px-3"
      )}>
        {!collapsed ? (
          <img
            src="https://res.cloudinary.com/drkudvyog/image/upload/v1774274783/Chrysos_Media_Logo_gmfbds.png"
            alt="Chrysos Media"
            className="h-10 w-auto object-contain"
          />
        ) : (
          <img
            src="https://res.cloudinary.com/drkudvyog/image/upload/v1774274783/Chrysos_Media_Logo_gmfbds.png"
            alt="Chrysos Media"
            className="h-7 w-7 object-contain"
          />
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
              {customIcons[item.page] ? (
                <div className="w-7 h-7 rounded-lg bg-white/80 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <img src={customIcons[item.page]} alt="" className="w-5 h-5 object-contain" style={{ filter: isActive ? "none" : "grayscale(40%) opacity(0.6)" }} />
                </div>
              ) : (
                <item.icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-[#C9A227]" : "text-gray-400")} />
              )}
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
              <p className="text-xs font-medium text-gray-800 truncate">{user?.full_name || "User"}</p>
              <p className="text-[11px] text-gray-400 truncate">{isAdmin ? "Admin" : isLawyer ? "Lawyer" : "Chatter"}</p>
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