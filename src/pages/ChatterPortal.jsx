import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, Users, Clock, CreditCard, MessageSquare, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import PageHeader from "../components/ui-custom/PageHeader";
import StatCard from "../components/ui-custom/StatCard";
import ChatterPayWidget from "../components/chatting/ChatterPayWidget";
import ChatterNotesWidget from "../components/chatting/ChatterNotesWidget";
import DailyBreakdownTable from "../components/chatting/DailyBreakdownTable";

/**
 * Výpočet výplaty dle pravidel
 */
function calcChatterEarned(totalChatted, hoursWorked) {
  if (totalChatted < 2000) return 0;
  const hourlyPart = hoursWorked * 120;
  if (totalChatted < 5000) return hourlyPart;
  if (totalChatted < 10000) return hourlyPart + totalChatted * 0.05;
  return hourlyPart + totalChatted * 0.10;
}

// Mini stat: celkem vyplaceno pro daného chattera
function ChatterPayoutStat({ chatterEmail }) {
  const { data: payouts = [] } = useQuery({
    queryKey: ["chatterPayouts", chatterEmail],
    queryFn: () => base44.entities.ChatterPayout.filter({ chatter_email: chatterEmail }),
    enabled: !!chatterEmail,
    staleTime: 30000,
  });
  const totalPaid = payouts.reduce((s, p) => s + (p.amount || 0), 0);
  return (
    <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] p-5 flex flex-col gap-1">
      <span className="text-xs text-gray-400 font-medium uppercase tracking-wide flex items-center gap-1.5">
        <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Celkem vyplaceno
      </span>
      <span className="text-2xl font-bold text-emerald-600 tabular-nums">{totalPaid.toLocaleString()}</span>
      <span className="text-xs text-gray-400">Kč</span>
    </div>
  );
}

// Admin view: all chatters overview
function AdminChattingSpace({ currentUser }) {
  const [selectedChatter, setSelectedChatter] = useState(null);

  const { data: users = [] } = useQuery({
    queryKey: ["users-chatters"],
    queryFn: () => base44.entities.User.list(),
    staleTime: 60000,
  });

  const { data: allPayments = [] } = useQuery({
    queryKey: ["all-payments-chatting"],
    queryFn: () => base44.entities.Payment.list("-created_date", 5000),
    staleTime: 60000,
  });

  const chatters = users.filter(u => {
    const uRoles = u.roles?.length > 0 ? u.roles : (u.role ? [u.role] : []);
    return uRoles.includes("chatter") || u.allowed_pages?.includes("ChatterPortal");
  });

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

  function getChatterStats(email) {
    const payments = allPayments.filter(p => p.chatter_email === email);
    const monthPayments = payments.filter(p => (p.payment_date || p.created_date?.split("T")[0]) >= monthStart);
    const monthTotal = monthPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const allTotal = payments.reduce((s, p) => s + (p.amount || 0), 0);
    return { payments, monthTotal, allTotal };
  }

  if (selectedChatter) {
    const stats = getChatterStats(selectedChatter.email);
    const monthPaymentsSelected = stats.payments.filter(p => (p.payment_date || p.created_date?.split("T")[0]) >= monthStart);
    return (
      <div className="p-4 lg:p-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setSelectedChatter(null)}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Zpět
          </button>
          <h2 className="text-lg font-bold text-gray-900">{selectedChatter.full_name}</h2>
          <span className="text-sm text-gray-400">{selectedChatter.email}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] p-5 flex flex-col gap-1">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wide flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#C9A227]" /> Tento měsíc
            </span>
            <span className="text-2xl font-bold text-gray-900 tabular-nums">{stats.monthTotal.toLocaleString()}</span>
            <span className="text-xs text-gray-400">Kč vychatováno</span>
          </div>
          <ChatterPayoutStat chatterEmail={selectedChatter.email} />
        </div>

        <div className="grid lg:grid-cols-2 gap-4 mb-4">
          <ChatterPayWidget
            chatterEmail={selectedChatter.email}
            hoursWorked={0}
            totalChatted={stats.monthTotal}
            monthPayments={stats.payments.filter(p => (p.payment_date || p.created_date?.split("T")[0]) >= monthStart)}
            isAdmin={true}
          />
          <ChatterNotesWidget chatterEmail={selectedChatter.email} currentUser={selectedChatter} />
        </div>

        <DailyBreakdownTable payments={monthPaymentsSelected} />

        {/* Payment history */}
        <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#C9A227]" /> Poslední platby
          </h3>
          {stats.payments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Zatím žádné platby</p>
          ) : (
            <div className="space-y-2">
              {stats.payments.slice(0, 10).map(p => (
                <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#faf6e6]/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{p.customer_name || "Zákazník"}</p>
                    <p className="text-xs text-gray-400">{p.model_name || "—"} · {p.created_date ? format(new Date(p.created_date), "d. M. yyyy") : "—"}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{(p.amount || 0).toLocaleString()} Kč</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      <PageHeader title="Chatting Space" subtitle="Přehled všech chatterů" />

      {chatters.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Zatím žádní chatteři</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {chatters.map(u => {
            const stats = getChatterStats(u.email);
            const earned = Math.round(calcChatterEarned(stats.monthTotal, 0));
            return (
              <button
                key={u.id}
                onClick={() => setSelectedChatter(u)}
                className="bg-white rounded-2xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] p-4 flex items-center justify-between hover:border-[#e8d99a] hover:shadow-[0_6px_24px_rgba(201,162,39,0.10)] transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C9A227] to-[#A8841C] flex items-center justify-center text-white text-sm font-bold">
                    {u.full_name?.charAt(0) || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{u.full_name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <p className="text-xs text-gray-400">Tento měsíc</p>
                    <p className="text-sm font-bold text-gray-900">{stats.monthTotal.toLocaleString()} Kč</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Výplata</p>
                    <p className="text-sm font-bold text-amber-600">{earned.toLocaleString()} Kč</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Plateb</p>
                    <p className="text-sm font-bold text-gray-700">{stats.payments.length}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Chatter's own view
function ChatterView({ currentUser }) {
  const email = currentUser?.email;

  const { data: payments = [] } = useQuery({
    queryKey: ["chatter-payments", email],
    queryFn: () => base44.entities.Payment.filter({ chatter_email: email }, "-created_date"),
    enabled: !!email,
    staleTime: 60000,
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ["chatterPayouts", email],
    queryFn: () => base44.entities.ChatterPayout.filter({ chatter_email: email }),
    enabled: !!email,
    staleTime: 30000,
  });

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const monthPayments = payments.filter(p => (p.payment_date || p.created_date?.split("T")[0]) >= monthStart);
  const monthRev = monthPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalPaid = payouts.reduce((s, p) => s + (p.amount || 0), 0);

  const greetings = [
    "Ahoj, doufám že se máš dneska fajn a pořádně to v chatech rozjedeme! 💪",
    "Vítej zpět! Dneska to bude skvělý den, věřím v tebe! 🔥",
    "Zdravím tě! Každá platba se počítá — makej a uvidíš výsledky! 🚀",
    "Ahoj! Připrav se, dneska bereme vše co jde! 💬✨",
  ];
  const greeting = greetings[new Date().getDate() % greetings.length];

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      {/* Motivační banner */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-[#C9A227] to-[#e8c84a] p-5 flex items-center gap-4 shadow-md">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl flex-shrink-0">
          👋
        </div>
        <div>
          <p className="text-white font-bold text-base leading-snug">{`Ahoj, ${currentUser?.full_name?.split(" ")[0] || ""}!`}</p>
          <p className="text-white/85 text-sm mt-0.5">{greeting}</p>
        </div>
      </div>

      {/* Stats — jen měsíc + vyplaceno */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] p-5 flex flex-col gap-1">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#C9A227]" /> Tento měsíc
          </span>
          <span className="text-2xl font-bold text-gray-900 tabular-nums">{monthRev.toLocaleString()}</span>
          <span className="text-xs text-gray-400">Kč vychatováno</span>
        </div>
        <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] p-5 flex flex-col gap-1">
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wide flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Celkem vyplaceno
          </span>
          <span className="text-2xl font-bold text-emerald-600 tabular-nums">{totalPaid.toLocaleString()}</span>
          <span className="text-xs text-gray-400">Kč</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <ChatterPayWidget
          chatterEmail={email}
          hoursWorked={0}
          totalChatted={monthRev}
          monthPayments={monthPayments}
          isAdmin={false}
        />
        <ChatterNotesWidget chatterEmail={email} currentUser={currentUser} />
      </div>

      <div className="mb-6">
        <DailyBreakdownTable payments={monthPayments} />
      </div>

      {/* Recent Payments */}
      <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] p-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[#C9A227]" /> Poslední platby
        </h3>
        {payments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Zatím žádné platby</p>
        ) : (
          <div className="space-y-2">
            {payments.slice(0, 10).map(p => (
              <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#faf6e6]/50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-700">{p.customer_name || "Zákazník"}</p>
                  <p className="text-xs text-gray-400">{p.model_name || "—"} · {p.created_date ? format(new Date(p.created_date), "d. M. yyyy") : "—"}</p>
                </div>
                <span className="text-sm font-semibold text-gray-900">{(p.amount || 0).toLocaleString()} Kč</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatterPortal({ currentUser }) {
  const roles = currentUser?.roles?.length > 0 ? currentUser.roles : (currentUser?.role ? [currentUser.role] : []);
  // Admins vidí všechny chattery, ostatní (vč. chatterů) vidí pouze svou vlastní kartu
  if (roles.includes("admin")) {
    return <AdminChattingSpace currentUser={currentUser} />;
  }
  return <ChatterView currentUser={currentUser} />;
}