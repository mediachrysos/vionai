import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import Sidebar from "./components/layout/Sidebar";
import { AnimatePresence, motion } from "framer-motion";
import { CreditCard, X } from "lucide-react";

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        base44.auth.redirectToLogin();
        return;
      }
      const me = await base44.auth.me();
      setUser(me);
      setLoading(false);
    };
    loadUser();
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-400 tracking-wide">Načítám...</p>
        </div>
      </div>
    );
  }

  // Blocked users
  if (user?.account_status === "blocked") {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm p-8">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🚫</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Přístup zablokován</h2>
          <p className="text-sm text-gray-500 mb-4">Váš účet byl zablokován. Kontaktujte administrátora.</p>
          <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-gray-600 underline">Odhlásit se</button>
        </div>
      </div>
    );
  }

  // Pending approval (skip for admins)
  if (user?.account_status === "pending" && user?.role !== "admin") {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm p-8">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⏳</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Čeká se na schválení</h2>
          <p className="text-sm text-gray-500 mb-4">Váš účet čeká na schválení administrátorem. Jakmile bude schválen, budete mít plný přístup.</p>
          <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-gray-600 underline">Odhlásit se</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50/50">
      <Sidebar currentPage={currentPageName} user={user} onLogout={handleLogout} />
      <main className="flex-1 min-w-0">
        <div className="page-transition">
          {React.cloneElement(children, { currentUser: user })}
        </div>
      </main>
    </div>
  );
}