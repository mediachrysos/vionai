import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, TrendingUp, DollarSign, CreditCard } from "lucide-react";
import PageHeader from "../components/ui-custom/PageHeader";
import NicknameSetupModal from "../components/ui-custom/NicknameSetupModal";
import { DEFAULT_TIERS } from "../components/chatter/tierUtils";
import DailyKpiCards from "../components/chatter/DailyKpiCards";
import TierLadder from "../components/chatter/TierLadder";
import MonthlyPaceCard from "../components/chatter/MonthlyPaceCard";
import MonthlyPayoutCard from "../components/chatter/MonthlyPayoutCard";
import DailyBreakdownCard from "../components/chatter/DailyBreakdownCard";
import PayoutSimulator from "../components/chatter/PayoutSimulator";
import PersonalRecords from "../components/chatter/PersonalRecords";
import ChatterLeaderboard from "../components/chatter/ChatterLeaderboard";
import CoachNotes from "../components/chatter/CoachNotes";
import RecentPaymentsCard from "../components/chatter/RecentPaymentsCard";
import ChatterPayWidget from "../components/chatting/ChatterPayWidget";

// ─── Admin view ────────────────────────────────────────────────────────────
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

  const chatters = users.filter((u) => {
    const uRoles = u.roles?.length > 0 ? u.roles : u.role ? [u.role] : [];
    return uRoles.includes("chatter") || u.allowed_pages?.includes("ChatterPortal");
  });

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

  function getStats(email) {
    const ps = allPayments.filter((p) => p.chatter_email === email);
    const month = ps.filter((p) => (p.payment_date || p.created_date?.split("T")[0]) >= monthStart);
    return {
      payments: ps,
      monthTotal: month.reduce((s, p) => s + (p.amount || 0), 0),
    };
  }

  if (selectedChatter) {
    const stats = getStats(selectedChatter.email);
    return (
      <div className="p-4 lg:p-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setSelectedChatter(null)} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">← Zpět</button>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{selectedChatter.nickname || selectedChatter.full_name}</h2>
            <p className="text-xs text-gray-400">{selectedChatter.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-2xl border border-[#ececec] p-5 shadow-sm flex flex-col gap-1">
            <span className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-[#C9A227]" /> Tento měsíc</span>
            <span className="text-2xl font-bold text-gray-900">{stats.monthTotal.toLocaleString()}</span>
            <span className="text-xs text-gray-400">Kč vychatováno</span>
          </div>
          <div className="bg-white rounded-2xl border border-[#ececec] p-5 shadow-sm flex flex-col gap-1">
            <span className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5 text-[#C9A227]" /> Plateb celkem</span>
            <span className="text-2xl font-bold text-gray-900">{stats.payments.length}</span>
          </div>
        </div>
        <ChatterPayWidget
          chatterEmail={selectedChatter.email}
          hoursWorked={0}
          totalChatted={stats.monthTotal}
          monthPayments={stats.payments.filter(p => (p.payment_date || p.created_date?.split("T")[0]) >= monthStart)}
          isAdmin={true}
        />
        <div className="mt-4">
          <RecentPaymentsCard payments={stats.payments} />
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
          {chatters.map((u) => {
            const stats = getStats(u.email);
            return (
              <button
                key={u.id}
                onClick={() => setSelectedChatter(u)}
                className="bg-white rounded-2xl border border-[#ececec] shadow-sm p-4 flex items-center justify-between hover:border-[#e8d99a] hover:shadow-md transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C9A227] to-[#A8841C] flex items-center justify-center text-white text-sm font-bold">
                    {(u.nickname || u.full_name || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{u.nickname || u.full_name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-right">
                  <div>
                    <p className="text-xs text-gray-400">Tento měsíc</p>
                    <p className="text-sm font-bold text-gray-900">{stats.monthTotal.toLocaleString()} Kč</p>
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

// ─── Chatter's own dashboard ──────────────────────────────────────────────
function ChatterView({ currentUser }) {
  const email = currentUser?.email;
  const qc = useQueryClient();
  const [nickname, setNickname] = useState(currentUser?.nickname || "");
  const [showNicknameModal, setShowNicknameModal] = useState(!currentUser?.nickname);

  const today = new Date().toISOString().split("T")[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

  // Payments
  const { data: payments = [] } = useQuery({
    queryKey: ["chatter-payments", email],
    queryFn: () => base44.entities.Payment.filter({ chatter_email: email }, "-created_date", 5000),
    enabled: !!email,
    staleTime: 30000,
  });

  // Payouts (paid out)
  const { data: payouts = [] } = useQuery({
    queryKey: ["chatterPayouts", email],
    queryFn: () => base44.entities.ChatterPayout.filter({ chatter_email: email }),
    enabled: !!email,
    staleTime: 30000,
  });

  // Performance rules
  const { data: rules = [] } = useQuery({
    queryKey: ["chatter-rules", email],
    queryFn: () => base44.entities.ChatterPerformanceRule.filter({ chatter_email: email }),
    enabled: !!email,
    staleTime: 60000,
  });

  // Daily performance records (for hours)
  const { data: dailyPerf = [] } = useQuery({
    queryKey: ["chatter-daily-perf", email],
    queryFn: () => base44.entities.ChatterDailyPerformance.filter({ chatter_email: email }),
    enabled: !!email,
    staleTime: 30000,
  });

  // All users for leaderboard
  const { data: allUsers = [] } = useQuery({
    queryKey: ["users-chatters"],
    queryFn: () => base44.entities.User.list(),
    staleTime: 60000,
  });

  const { data: allPayments = [] } = useQuery({
    queryKey: ["all-payments-chatting"],
    queryFn: () => base44.entities.Payment.list("-created_date", 5000),
    staleTime: 60000,
  });

  // Notes
  const { data: notes = [], refetch: refetchNotes } = useQuery({
    queryKey: ["coach-notes", email],
    queryFn: () => base44.entities.ChatterNote.filter({ chatter_email: email }, "-note_date"),
    enabled: !!email,
    staleTime: 30000,
  });

  // Active rule
  const activeRule = rules.find(r => r.is_active) || null;
  const tiers = DEFAULT_TIERS; // Use default fixed tiers always

  // Hours map from daily perf records
  const hoursMap = {};
  dailyPerf.forEach(d => { hoursMap[d.date] = d.hours_worked || 0; });

  // Computed values
  const todayPayments = payments.filter(p => (p.payment_date || p.created_date?.split("T")[0]) === today);
  const monthPayments = payments.filter(p => (p.payment_date || p.created_date?.split("T")[0]) >= monthStart);
  const todayRevenue = todayPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const monthRevenue = monthPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const hoursToday = hoursMap[today] || 0;
  const totalPaidOut = payouts.reduce((s, p) => s + (p.amount || 0), 0);

  // Chatters for leaderboard
  const chatters = allUsers.filter(u => {
    const uRoles = u.roles?.length > 0 ? u.roles : u.role ? [u.role] : [];
    return uRoles.includes("chatter") || u.allowed_pages?.includes("ChatterPortal");
  });

  const displayName = nickname || currentUser?.full_name?.split(" ")[0] || "";

  const greetings = [
    "Dostaň se dnes přes 2 000 Kč a odemkni hodinovku! 💪",
    "5 000 Kč = 5% provize. Jdi na to! 🔥",
    "Každá platba tě posouvá blíž k dalšímu tieru. 🚀",
    "10 000 Kč = 10% provize. Dneska to dáme! ⚡",
  ];
  const greeting = greetings[new Date().getDate() % greetings.length];

  const handleAddNote = async (content) => {
    await base44.entities.ChatterNote.create({
      chatter_email: email,
      content,
      note_date: today,
    });
    refetchNotes();
  };

  const handleDeleteNote = async (id) => {
    await base44.entities.ChatterNote.delete(id);
    refetchNotes();
  };

  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      {showNicknameModal && (
        <NicknameSetupModal
          user={currentUser}
          onSaved={(n) => { setNickname(n); setShowNicknameModal(false); }}
        />
      )}

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1a1207] via-[#2d1f07] to-[#1a1207] px-6 pt-8 pb-16 relative overflow-hidden">
        {/* Glow orbs */}
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-[#C9A227]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-[#e8c84a]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto relative">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[#C9A227] text-xs font-semibold uppercase tracking-widest mb-1">Chatting Space</p>
              <h1 className="text-white text-2xl font-bold mb-1">Ahoj, {displayName} 👋</h1>
              <p className="text-white/50 text-sm">{greeting}</p>
            </div>
            <div className="text-right bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl px-5 py-3">
              <p className="text-white/40 text-[10px] uppercase tracking-widest mb-0.5">Revenue dnes</p>
              <p className="text-white text-2xl font-bold tabular-nums">{todayRevenue.toLocaleString()}</p>
              <p className="text-[#C9A227] text-xs font-medium">Kč</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 lg:px-6 -mt-8 pb-12 space-y-4">

        {/* 4 KPI cards — pulled up over hero */}
        <DailyKpiCards
          todayRevenue={todayRevenue}
          hoursWorked={hoursToday}
          dailyGoalAmount={activeRule?.daily_goal_amount || 0}
          dailyGoalEnabled={!!activeRule?.daily_goal_enabled}
          tiers={tiers}
        />

        {/* Tier ladder + monthly pace side by side on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TierLadder
            todayRevenue={todayRevenue}
            hoursWorked={hoursToday}
            dailyGoalAmount={activeRule?.daily_goal_amount || 0}
            dailyGoalEnabled={!!activeRule?.daily_goal_enabled}
            tiers={tiers}
          />
          <MonthlyPaceCard
            monthRevenue={monthRevenue}
            monthlyGoalAmount={activeRule?.monthly_goal_amount || 0}
            monthlyGoalEnabled={!!activeRule?.monthly_goal_enabled}
          />
        </div>

        {/* Monthly payout full width */}
        <MonthlyPayoutCard
          monthPayments={monthPayments}
          totalPaidOut={totalPaidOut}
          monthlyBonusEnabled={!!activeRule?.monthly_bonus_enabled}
          monthlyBonusAmount={activeRule?.monthly_bonus_amount || 0}
          monthlyBonusConditionRevenue={activeRule?.monthly_bonus_condition_revenue || 0}
          hoursMap={hoursMap}
          tiers={tiers}
        />

        {/* Payout simulator */}
        <PayoutSimulator
          todayRevenue={todayRevenue}
          hoursWorked={hoursToday}
          monthRevenue={monthRevenue}
          monthlyGoalAmount={activeRule?.monthly_goal_amount || 0}
          monthlyGoalEnabled={!!activeRule?.monthly_goal_enabled}
          tiers={tiers}
        />

        {/* Daily breakdown */}
        <DailyBreakdownCard
          monthPayments={monthPayments}
          dailyGoalAmount={activeRule?.daily_goal_amount || 0}
          dailyGoalEnabled={!!activeRule?.daily_goal_enabled}
          hoursMap={hoursMap}
          tiers={tiers}
        />

        {/* Personal records + Leaderboard side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PersonalRecords
            allPayments={payments}
            tiers={tiers}
            hoursMap={hoursMap}
          />
          {chatters.length > 1 && (
            <ChatterLeaderboard
              chatters={chatters}
              allPayments={allPayments}
              currentUserEmail={email}
              tiers={tiers}
            />
          )}
        </div>

        {/* Coach notes + Recent payments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CoachNotes
            notes={notes}
            isAdmin={false}
            chatterEmail={email}
            onAdd={handleAddNote}
            onDelete={handleDeleteNote}
          />
          <RecentPaymentsCard payments={payments} />
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────
export default function ChatterPortal({ currentUser }) {
  const roles = currentUser?.roles?.length > 0 ? currentUser.roles : currentUser?.role ? [currentUser.role] : [];
  // Pure admin (no chatter role) sees admin overview
  // If user has chatter role (even alongside admin), show chatter dashboard
  const isChatter = roles.includes("chatter");
  const isAdminOnly = roles.includes("admin") && !isChatter;
  if (isAdminOnly) return <AdminChattingSpace currentUser={currentUser} />;
  return <ChatterView currentUser={currentUser} />;
}