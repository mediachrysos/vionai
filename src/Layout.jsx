import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import Sidebar from "./components/layout/Sidebar";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import PaymentFormModal from "./components/payments/PaymentFormModal";
import GlobalLoadingIndicator from "./components/layout/GlobalLoadingIndicator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const qc = useQueryClient();

  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => base44.entities.Customer.list("-created_date", 5000), enabled: !!user, staleTime: 0 });
  const { data: models = [] } = useQuery({ queryKey: ["models"], queryFn: () => base44.entities.Model.list(), enabled: !!user, staleTime: 120000 });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => base44.entities.User.list(), enabled: !!user, staleTime: 120000 });

  const { data: bankAccounts = [] } = useQuery({ queryKey: ["bankAccounts"], queryFn: () => base44.entities.BankAccount.filter({ is_active: true }), enabled: !!user, staleTime: 60000 });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      // Payout mode — save only as WalletTransaction, do NOT update customer stats or payment list
      if (data.is_payout) {
        const acc = bankAccounts.find(a => a.id === data.bank_account_id);
        const tx = await base44.entities.WalletTransaction.create({
          title: data.note || "Payout",
          amount: data.amount,
          type: "expense",
          category: "Payout",
          account_id: data.bank_account_id || "",
          account_name: acc?.name || "",
          transaction_date: data.payment_date || new Date().toISOString().split("T")[0],
          note: data.note || "",
        });
        return tx;
      }

      const payment = await base44.entities.Payment.create(data);
      if (data.customer_id) {
        // Fetch fresh to avoid stale cache race condition (same fix as BankAccount below)
        const freshCustomers = await base44.entities.Customer.filter({ id: data.customer_id });
        const cust = freshCustomers[0];
        if (cust) {
          const updates = {
            total_spent: (cust.total_spent || 0) + (data.amount || 0),
            payment_count: (cust.payment_count || 0) + 1,
          };
          if (data.service_type) {
            const entry = data.model_name ? `${data.model_name}: ${data.service_type}` : data.service_type;
            updates.sent_content = cust.sent_content ? `${cust.sent_content}\n${entry}` : entry;
          }
          await base44.entities.Customer.update(data.customer_id, updates);
        }
      }
      // Update BankAccount balance — always fetch fresh to avoid stale cache race condition
      if (data.bank_account_id) {
        const freshAccounts = await base44.entities.BankAccount.filter({ id: data.bank_account_id });
        const acc = freshAccounts[0];
        if (acc) {
          await base44.entities.BankAccount.update(data.bank_account_id, {
            balance: (acc.balance || 0) + (data.amount || 0),
          });
        }
      }
      return payment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["bankAccounts"] });
      setShowPaymentForm(false);
    },
  });

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

      // Redirect non-admins to their first allowed page if they're on a page they can't access
      const meRoles = me?.roles?.length > 0 ? me.roles : (me?.role ? [me.role] : []);
      if (!meRoles.includes("admin")) {
        let allowedPages;
        if (me?.allowed_pages?.length > 0) {
          allowedPages = me.allowed_pages;
        } else {
          // Mirror the same role-based logic as Sidebar
          const pageSet = new Set();
          if (meRoles.includes("lawyer")) pageSet.add("Finance");
          if (meRoles.includes("chatter")) {
            pageSet.add("ChatterPortal");
          }
          if (meRoles.includes("grafik")) pageSet.add("SocialMediaContent");
          if (pageSet.size === 0 && !meRoles.includes("grafik")) {
            pageSet.add("ChatterPortal");
          }
          allowedPages = Array.from(pageSet);
        }

        // Detail pages are reached by navigating from an already-allowed list page
        // (Customers, ChatterPortal, SocialMediaContent...) — never gate them directly.
        const ALWAYS_ALLOWED_DETAIL_PAGES = ["CustomerDetail", "ModelDetail", "ChatterDetail"];
        const currentPath = window.location.pathname.replace("/", "") || "Dashboard";
        if (!allowedPages.includes(currentPath) && !ALWAYS_ALLOWED_DETAIL_PAGES.includes(currentPath)) {
          const firstPage = allowedPages[0] || "ChatterPortal";
          window.location.replace(`/${firstPage}`);
        }
      }
    };
    loadUser();
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  useEffect(() => {
    // Keep current user's own data (e.g. assigned_model_ids changed by admin) live-updated
    const unsubUser = base44.entities.User.subscribe((event) => {
      if (event.type === "update" && event.data && user?.id && event.data.id === user.id) {
        setUser((prev) => ({ ...prev, ...event.data }));
      }
    });
    return () => { unsubUser(); };
  }, [user]);

  // CustomerOnboarding is a public page — skip auth entirely
  if (currentPageName === "CustomerOnboarding") {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#272727]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-slate-600 border-t-[#C9A227] rounded-full animate-spin" />
          <p className="text-xs text-slate-500 tracking-wide">Loading...</p>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Access Blocked</h2>
          <p className="text-sm text-gray-500 mb-4">Your account has been blocked. Please contact an administrator.</p>
          <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-gray-600 underline">Log out</button>
        </div>
      </div>
    );
  }

  // Pending approval (skip for admins)
  const userRoles = user?.roles?.length > 0 ? user.roles : (user?.role ? [user.role] : []);
  const isActive = user?.account_status === "active" || user?.account_status === "approved";
  if (!isActive && !userRoles.includes("admin")) {
    // New user with no status — send to JoinSpace waiting list
    if (!user?.account_status) {
      if (window.location.pathname !== "/JoinSpace" && window.location.pathname !== "/RequestSpace") {
        window.location.replace("/JoinSpace");
        return null;
      }
      return <>{children}</>;
    }
    // User is pending — show waiting screen
    return (
      <div className="h-screen flex items-center justify-center bg-[#1a1a1a]">
        <div className="text-center max-w-sm p-8">
          <div className="w-14 h-14 rounded-full bg-amber-950/50 border border-amber-700/30 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⏳</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-100 mb-2">Pending Approval</h2>
          <p className="text-sm text-slate-400 mb-4">Your account is waiting for administrator approval. Once approved, you will have full access.</p>
          <button onClick={handleLogout} className="text-xs text-slate-500 hover:text-slate-300 underline">Log out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#1a1a1a]">
      <Sidebar currentPage={currentPageName} user={user} onLogout={handleLogout} />
      <GlobalLoadingIndicator />
      <main className="flex-1 min-w-0">
        <div className="page-transition">
          {React.cloneElement(children, { currentUser: user })}
        </div>
      </main>

      {/* Global FAB - Add payment */}
      {user && (
        <motion.button
          onClick={() => setShowPaymentForm(true)}
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#1e1e1e] border border-[#C9A227]/30 shadow-lg hover:border-[#C9A227]/60 hover:shadow-[0_0_20px_rgba(201,162,39,0.15)] transition-all group"
        >
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#C9A227] to-[#A8841C] flex items-center justify-center flex-shrink-0 shadow-md">
            <Plus className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-[#C9A227] tracking-wide">Add payment</span>
        </motion.button>
      )}

      {/* Global payment form modal */}
      <PaymentFormModal
        open={showPaymentForm}
        onClose={() => setShowPaymentForm(false)}
        onSave={saveMutation.mutateAsync}
        customers={customers}
        models={models}
        users={users}
        bankAccounts={bankAccounts}
        currentUser={user}
      />
    </div>
  );
}