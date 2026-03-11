import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import Sidebar from "./components/layout/Sidebar";
import { AnimatePresence, motion } from "framer-motion";
import { CreditCard, X, Plus } from "lucide-react";
import PaymentFormModal from "./components/payments/PaymentFormModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentAlert, setPaymentAlert] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const qc = useQueryClient();

  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => base44.entities.Customer.list("-created_date", 500), enabled: !!user });
  const { data: models = [] } = useQuery({ queryKey: ["models"], queryFn: () => base44.entities.Model.list(), enabled: !!user });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => base44.entities.User.list(), enabled: !!user });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
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
      return payment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["customers"] });
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
    };
    loadUser();
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  useEffect(() => {
    const unsubscribe = base44.entities.Payment.subscribe((event) => {
      if (event.type === "create" && event.data) {
        setPaymentAlert(event.data);
        setTimeout(() => setPaymentAlert(null), 5000);
      }
    });
    return unsubscribe;
  }, []);

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

  // Pending approval (skip for admins) — new users without account_status set are also pending
  if ((user?.account_status === "pending" || !user?.account_status) && user?.role !== "admin") {
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
              <p className="text-sm font-semibold text-gray-800">Nová platba přidána!</p>
              <p className="text-xs text-gray-500">
                {paymentAlert.customer_name || "Zákazník"} · {(paymentAlert.amount || 0).toLocaleString()} Kč
              </p>
            </div>
            <button onClick={() => setPaymentAlert(null)} className="text-gray-300 hover:text-gray-500">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}