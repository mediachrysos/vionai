import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import Sidebar from "./components/layout/Sidebar";
import { AnimatePresence, motion } from "framer-motion";
import { CreditCard, X, Plus, UserPlus, ImagePlay } from "lucide-react";
import PaymentFormModal from "./components/payments/PaymentFormModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

function speakAlert(text) {
  try {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "cs-CZ";
    utter.rate = 1.15;
    utter.pitch = 1.1;
    utter.volume = 1;
    // Pick Czech voice if available
    const voices = window.speechSynthesis.getVoices();
    const czVoice = voices.find(v => v.lang === "cs-CZ") || voices.find(v => v.lang.startsWith("cs"));
    if (czVoice) utter.voice = czVoice;
    window.speechSynthesis.speak(utter);
  } catch (_) {}
}

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentAlert, setPaymentAlert] = useState(null);
  const [customerAlert, setCustomerAlert] = useState(null);
  const [taskSubmitAlert, setTaskSubmitAlert] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const qc = useQueryClient();

  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => base44.entities.Customer.list("-created_date", 5000), enabled: !!user, staleTime: 0 });
  const { data: models = [] } = useQuery({ queryKey: ["models"], queryFn: () => base44.entities.Model.list(), enabled: !!user, staleTime: 120000 });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => base44.entities.User.list(), enabled: !!user, staleTime: 120000 });

  const { data: bankAccounts = [] } = useQuery({ queryKey: ["bankAccounts"], queryFn: () => base44.entities.BankAccount.filter({ is_active: true }), enabled: !!user });

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
        const cust = customers.find(c => c.id === data.customer_id);
        if (cust) {
          await base44.entities.Customer.update(data.customer_id, {
            total_spent: (cust.total_spent || 0) + (data.amount || 0),
            payment_count: (cust.payment_count || 0) + 1,
          });
        }
      }
      // Update BankAccount balance — fetch fresh record to avoid stale cache
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
          if (meRoles.includes("chatter") || meRoles.includes("grafik")) {
            pageSet.add("ChatterPortal");
            pageSet.add("Customers");
          }
          if (meRoles.includes("grafik")) pageSet.add("SocialMediaContent");
          if (pageSet.size === 0) {
            pageSet.add("ChatterPortal");
            pageSet.add("Customers");
          }
          allowedPages = Array.from(pageSet);
        }

        const currentPath = window.location.pathname.replace("/", "") || "Dashboard";
        if (!allowedPages.includes(currentPath)) {
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
    const unsubPayment = base44.entities.Payment.subscribe((event) => {
      if (event.type === "create" && event.data) {
        const name = event.data.customer_name || "Zákazník";
        const amount = event.data.amount ? `${event.data.amount.toLocaleString()} korun` : "";
        if (user?.role === "admin") speakAlert(`${name} poslal ${amount}. Děkujeme!`);
        setPaymentAlert(event.data);
        setTimeout(() => setPaymentAlert(null), 5000);
      }
    });
    const unsubCustomer = base44.entities.Customer.subscribe((event) => {
      if (event.type === "create" && event.data) {
        const name = event.data.full_name || "Nový zákazník";
        if (user?.role === "admin") speakAlert(`Nový zákazník! ${name} se právě přidal.`);
        setCustomerAlert(event.data);
        setTimeout(() => setCustomerAlert(null), 5000);
      }
    });
    const unsubTaskSubmit = base44.entities.DaySubmission.subscribe((event) => {
      if ((event.type === "create" || event.type === "update") && event.data && user?.role === "admin") {
        const subs = event.data.task_submissions || [];
        const justSubmitted = subs.filter(ts => ts.status === "submitted");
        if (justSubmitted.length > 0) {
          const designer = event.data.designer_email?.split("@")[0] || "Designer";
          const dayName = event.data.day_name || event.data.day_key || "";
          speakAlert(`${designer} poslal úkol ke schválení.`);
          setTaskSubmitAlert({ designer, dayName, count: justSubmitted.length });
          setTimeout(() => setTaskSubmitAlert(null), 6000);
        }
      }
    });
    return () => { unsubPayment(); unsubCustomer(); unsubTaskSubmit(); };
  }, [user]);

  // CustomerOnboarding is a public page — skip auth entirely
  if (currentPageName === "CustomerOnboarding") {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0c1120]">
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

  // Pending approval (skip for admins) — new users without account_status set are also pending
  const userRoles = user?.roles?.length > 0 ? user.roles : (user?.role ? [user.role] : []);
  if ((user?.account_status === "pending" || !user?.account_status) && !userRoles.includes("admin")) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-sm p-8">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⏳</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Pending Approval</h2>
          <p className="text-sm text-gray-500 mb-4">Your account is waiting for administrator approval. Once approved, you will have full access.</p>
          <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-gray-600 underline">Log out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0c1120]">
      <Sidebar currentPage={currentPageName} user={user} onLogout={handleLogout} />
      <main className="flex-1 min-w-0">
        <div className="page-transition">
          {React.cloneElement(children, { currentUser: user })}
        </div>
      </main>

      {/* Global FAB - Add payment */}
      {user && (
        <motion.button
          onClick={() => setShowPaymentForm(true)}
          whileHover={{ scale: 1.07 }}
          whileTap={{ scale: 0.95 }}
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-[#C9A227] to-[#A8841C] shadow-lg shadow-amber-200 flex items-center justify-center text-white hover:shadow-xl hover:shadow-amber-300 transition-shadow"
        >
          <img src="https://res.cloudinary.com/drkudvyog/image/upload/v1774300825/Chrysos_icon_21_qx0oko.png" alt="" className="w-6 h-6 object-contain" />
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

      {/* New payment alert */}
      <AnimatePresence>
        {paymentAlert && (
          <motion.div
            initial={{ opacity: 0, y: 60, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 60, x: "-50%" }}
            className="fixed bottom-6 left-1/2 z-50 bg-white border border-emerald-200 rounded-2xl shadow-xl px-5 py-3.5 flex items-center gap-3 min-w-[280px]"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">New payment added!</p>
              <p className="text-xs text-gray-500">
                {paymentAlert.customer_name || "Customer"} · {(paymentAlert.amount || 0).toLocaleString()} CZK
              </p>
            </div>
            <button onClick={() => setPaymentAlert(null)} className="text-gray-300 hover:text-gray-500">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New customer alert */}
      <AnimatePresence>
        {customerAlert && (
          <motion.div
            initial={{ opacity: 0, y: 60, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 60, x: "-50%" }}
            className="fixed bottom-24 left-1/2 z-50 bg-white border border-indigo-200 rounded-2xl shadow-xl px-5 py-3.5 flex items-center gap-3 min-w-[280px]"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <UserPlus className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">New customer!</p>
              <p className="text-xs text-gray-500">{customerAlert.full_name || "New customer"} just joined the platform</p>
            </div>
            <button onClick={() => setCustomerAlert(null)} className="text-gray-300 hover:text-gray-500">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Task submitted alert */}
      <AnimatePresence>
        {taskSubmitAlert && (
          <motion.div
            initial={{ opacity: 0, y: 60, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 60, x: "-50%" }}
            className="fixed bottom-44 left-1/2 z-50 bg-white border border-purple-200 rounded-2xl shadow-xl px-5 py-3.5 flex items-center gap-3 min-w-[280px]"
          >
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <ImagePlay className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">Task submitted for review!</p>
              <p className="text-xs text-gray-500">{taskSubmitAlert.designer} · {taskSubmitAlert.dayName}</p>
            </div>
            <button onClick={() => setTaskSubmitAlert(null)} className="text-gray-300 hover:text-gray-500">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}