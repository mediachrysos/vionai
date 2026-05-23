import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import PageHeader from "../components/ui-custom/PageHeader";
import NicknameSetupModal from "../components/ui-custom/NicknameSetupModal";
import OnboardingLinkForm from "../components/customers/OnboardingLinkForm";
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
import StatsCard from "../components/chatter/StatsCard";
import ChatterPayWidget from "../components/chatting/ChatterPayWidget";
import WorkSessionWidget from "../components/chatter/WorkSessionWidget";
import PayoutHistoryWidget from "../components/chatter/PayoutHistoryWidget";
import CustomerPayoutList from "../components/chatter/CustomerPayoutList";
import ChatterCustomersList from "../components/chatter/ChatterCustomersList";

// ─── Admin view ────────────────────────────────────────────────────────────
function AdminChattingSpace({ currentUser }) {
  const [selectedChatter, setSelectedChatter] = useState(null);

  const { data: users = [] } = useQuery({
    queryKey: ["users-chatters"],
    queryFn: () => base44.entities.User.list(),
    staleTime: 60000
  });

  const { data: models = [] } = useQuery({
    queryKey: ["models"],
    queryFn: () => base44.entities.Model.list(),
    staleTime: 120000
  });

  const { data: allPayments = [] } = useQuery({
    queryKey: ["all-payments-chatting"],
    queryFn: () => base44.entities.Payment.list("-created_date", 5000),
    staleTime: 60000
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
      monthTotal: month.reduce((s, p) => s + (p.amount || 0), 0)
    };
  }

  if (selectedChatter) {
    return (
      <div>
        <div className="bg-white border-b border-[#ececec] px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => setSelectedChatter(null)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors font-medium">
            
            ← Zpět na přehled
          </button>
          <span className="text-gray-200">|</span>
          <span className="text-xs text-gray-400">Zobrazuješ dashboard jako: <span className="font-semibold text-[#C9A227]">{selectedChatter.nickname || selectedChatter.full_name}</span></span>
        </div>
        <ChatterView currentUser={selectedChatter} isAdminView={true} />
      </div>);

  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      <PageHeader title="Chatting Space" subtitle="Přehled všech chatterů" />
      {chatters.length === 0 ?
      <div className="text-center py-16 text-gray-400">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Zatím žádní chatteři</p>
        </div> :

      <div className="grid gap-3">
          {chatters.map((u) => {
          const stats = getStats(u.email);
          return (
            <button
              key={u.id}
              onClick={() => setSelectedChatter(u)}
              className="bg-white rounded-2xl border border-[#ececec] shadow-sm p-4 flex items-center justify-between hover:border-[#e8d99a] hover:shadow-md transition-all text-left">
              
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
              </button>);

        })}
        </div>
      }
    </div>);

}

// ─── Chatter's own dashboard ──────────────────────────────────────────────
function ChatterView({ currentUser, isAdminView = false }) {
  const email = currentUser?.email;
  const qc = useQueryClient();
  const [nickname, setNickname] = useState(currentUser?.nickname || "");
  const [showNicknameModal, setShowNicknameModal] = useState(!isAdminView && !currentUser?.nickname);

  const { data: models = [] } = useQuery({
    queryKey: ["models"],
    queryFn: () => base44.entities.Model.list(),
    staleTime: 120000
  });

  const today = new Date().toISOString().split("T")[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

  // Payments
  const { data: payments = [] } = useQuery({
    queryKey: ["chatter-payments", email],
    queryFn: () => base44.entities.Payment.filter({ chatter_email: email }, "-created_date", 5000),
    enabled: !!email,
    staleTime: 30000
  });

  // Payouts (paid out)
  const { data: payouts = [] } = useQuery({
    queryKey: ["chatterPayouts", email],
    queryFn: () => base44.entities.ChatterPayout.filter({ chatter_email: email }),
    enabled: !!email,
    staleTime: 30000
  });

  // Performance rules
  const { data: rules = [] } = useQuery({
    queryKey: ["chatter-rules", email],
    queryFn: () => base44.entities.ChatterPerformanceRule.filter({ chatter_email: email }),
    enabled: !!email,
    staleTime: 60000
  });

  // Daily performance records (for hours)
  const { data: dailyPerf = [] } = useQuery({
    queryKey: ["chatter-daily-perf", email],
    queryFn: () => base44.entities.ChatterDailyPerformance.filter({ chatter_email: email }),
    enabled: !!email,
    staleTime: 30000
  });

  // All users for leaderboard
  const { data: allUsers = [] } = useQuery({
    queryKey: ["users-chatters"],
    queryFn: () => base44.entities.User.list(),
    staleTime: 60000
  });

  const { data: allPayments = [] } = useQuery({
    queryKey: ["all-payments-chatting"],
    queryFn: () => base44.entities.Payment.list("-created_date", 5000),
    staleTime: 60000
  });

  // Notes
  const { data: notes = [], refetch: refetchNotes } = useQuery({
    queryKey: ["coach-notes", email],
    queryFn: () => base44.entities.ChatterNote.filter({ chatter_email: email }, "-note_date"),
    enabled: !!email,
    staleTime: 30000
  });

  // Active rule
  const activeRule = rules.find((r) => r.is_active) || null;
  const tiers = DEFAULT_TIERS; // Use default fixed tiers always

  // Hours map from daily perf records
  const hoursMap = {};
  dailyPerf.forEach((d) => {hoursMap[d.date] = d.hours_worked || 0;});

  // Computed values
  const todayPayments = payments.filter((p) => (p.payment_date || p.created_date?.split("T")[0]) === today);
  const monthPayments = payments.filter((p) => (p.payment_date || p.created_date?.split("T")[0]) >= monthStart);
  const todayRevenue = todayPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const monthRevenue = monthPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const hoursToday = hoursMap[today] || 0;
  const totalPaidOut = payouts.reduce((s, p) => s + (p.amount || 0), 0);

  // Chatters for leaderboard
  const chatters = allUsers.filter((u) => {
    const uRoles = u.roles?.length > 0 ? u.roles : u.role ? [u.role] : [];
    return uRoles.includes("chatter") || u.allowed_pages?.includes("ChatterPortal");
  });

  const displayName = nickname || currentUser?.full_name?.split(" ")[0] || "";

  const greetings = [
  "Dostaň se dnes přes 2 000 Kč a odemkni hodinovku! 💪",
  "5 000 Kč = 5% provize. Jdi na to! 🔥",
  "Každá platba tě posouvá blíž k dalšímu tieru. 🚀",
  "10 000 Kč = 10% provize. Dneska to dáme! ⚡"];

  const greeting = greetings[new Date().getDate() % greetings.length];

  const handleAddNote = async (content) => {
    await base44.entities.ChatterNote.create({
      chatter_email: email,
      content,
      note_date: today
    });
    refetchNotes();
  };

  const handleDeleteNote = async (id) => {
    await base44.entities.ChatterNote.delete(id);
    refetchNotes();
  };

  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      {showNicknameModal &&
      <NicknameSetupModal
        user={currentUser}
        onSaved={(n) => {setNickname(n);setShowNicknameModal(false);}} />

      }

      {/* Hero */}
       <div className="bg-white border-b border-[#ececec] px-6 pt-6 pb-5">
         <div className="max-w-5xl mx-auto flex items-center justify-between">
           <p className="text-[#C9A227] text-xs font-semibold uppercase tracking-widest">Chatting Space</p>
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9A227] to-[#A8841C] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
               {(displayName || "?")[0].toUpperCase()}
             </div>
             <p className="text-gray-900 text-sm font-semibold">{displayName}</p>
           </div>
         </div>
       </div>

      <div className="max-w-5xl mx-auto px-4 lg:px-6 pt-6 pb-12 space-y-4">

        {/* Notes + Onboarding link */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
           <CoachNotes
            notes={notes}
            chatterEmail={email}
            onAdd={handleAddNote}
            onDelete={handleDeleteNote} />
           
           <OnboardingLinkForm models={models.filter((m) => {
              const ids = currentUser?.assigned_model_ids || (currentUser?.assigned_model ? [currentUser.assigned_model] : []);
              return ids.length === 0 || ids.includes(m.id);
            })} />
         </div>

        {/* Dnešní výkonnost — full width */}
        <div className="bg-white border border-[#ececec] rounded-2xl overflow-hidden">
          <TierLadder
            todayRevenue={todayRevenue}
            hoursWorked={hoursToday}
            dailyGoalAmount={activeRule?.daily_goal_amount || 0}
            dailyGoalEnabled={!!activeRule?.daily_goal_enabled}
            tiers={tiers}
            email={email} />
          <div className="hidden">
            <div className="flex items-center justify-between">







              
              <WorkSessionWidget email={email} />
            </div>
          </div>
        </div>
        

        {/* Monthly pace */}
        <MonthlyPaceCard
          monthRevenue={monthRevenue}
          monthlyGoalAmount={activeRule?.monthly_goal_amount || 0}
          monthlyGoalEnabled={!!activeRule?.monthly_goal_enabled} />

        {/* Výplata */}
        <MonthlyPayoutCard
          allPayments={payments}
          payouts={payouts}
          monthlyBonusEnabled={!!activeRule?.monthly_bonus_enabled}
          monthlyBonusAmount={activeRule?.monthly_bonus_amount || 0}
          monthlyBonusConditionRevenue={activeRule?.monthly_bonus_condition_revenue || 0}
          hoursMap={hoursMap}
          tiers={tiers} />
        

        {/* Payout simulator */}
        <PayoutSimulator
          todayRevenue={todayRevenue}
          hoursWorked={hoursToday}
          monthRevenue={monthRevenue}
          monthlyGoalAmount={activeRule?.monthly_goal_amount || 0}
          monthlyGoalEnabled={!!activeRule?.monthly_goal_enabled}
          tiers={tiers} />
        

        {/* Daily breakdown — collapsed by default */}
        <div className="hidden">
          <DailyBreakdownCard
            monthPayments={monthPayments}
            dailyGoalAmount={activeRule?.daily_goal_amount || 0}
            dailyGoalEnabled={!!activeRule?.daily_goal_enabled}
            hoursMap={hoursMap}
            tiers={tiers} />
        </div>
        

        {/* Personal records full width */}
        <PersonalRecords
          allPayments={payments}
          tiers={tiers}
          hoursMap={hoursMap} />

        {/* Leaderboard */}
        {chatters.length > 1 &&
        <ChatterLeaderboard
          chatters={chatters}
          allPayments={allPayments}
          currentUserEmail={email}
          tiers={tiers} />
        }

        {/* Today stats + Recent payments */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
           <StatsCard
            todayRevenue={todayRevenue}
            hoursWorked={hoursToday}
            nextTierRevenue={5000} />
          
          <RecentPaymentsCard payments={payments} />
        </div>

        {/* Customers payout list */}
        <CustomerPayoutList email={email} />

        {/* Chatter's customers — only for own dashboard */}
        {!isAdminView &&
        <ChatterCustomersList
          chatterEmail={email}
          assignedModelIds={currentUser?.assigned_model_ids || (currentUser?.assigned_model ? [currentUser.assigned_model] : [])} />
        }
      </div>
    </div>);

}

// ─── Main export ──────────────────────────────────────────────────────────
export default function ChatterPortal({ currentUser }) {
  const roles = currentUser?.roles?.length > 0 ? currentUser.roles : currentUser?.role ? [currentUser.role] : [];
  const isChatter = roles.includes("chatter");
  const isAdmin = roles.includes("admin");
  // Pure admin (no chatter role) sees admin overview where they can click into any chatter's view
  if (isAdmin && !isChatter) return <AdminChattingSpace currentUser={currentUser} />;
  return <ChatterView currentUser={currentUser} />;
}