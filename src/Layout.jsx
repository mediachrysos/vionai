import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import Sidebar from "./components/layout/Sidebar";

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