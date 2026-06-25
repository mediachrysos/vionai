import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, BarChart2, Users } from "lucide-react";
import PageHeader from "../components/ui-custom/PageHeader";
import NicknameSetupModal from "../components/ui-custom/NicknameSetupModal";
import OnboardingLinkForm from "../components/customers/OnboardingLinkForm";
import { DEFAULT_TIERS } from "../components/chatter/tierUtils";
import TierLadder from "../components/chatter/TierLadder";
import MonthlyPaceCard from "../components/chatter/MonthlyPaceCard";
import TodayPaymentsWidget from "../components/chatter/TodayPaymentsWidget";
import { ChatterShiftPicker, AdminShiftCalendar } from "../components/chatter/ShiftCalendar";
import ChatterScraperEmbed from "../components/chatter/ChatterScraperEmbed";
import CoachNotes from "../components/chatter/CoachNotes";
import RecentPaymentsCard from "../components/chatter/RecentPaymentsCard";
import StatsCard from "../components/chatter/StatsCard";
import ChatterPayWidget from "../components/chatting/ChatterPayWidget";
import ChatterCustomersList from "../components/chatter/ChatterCustomersList";
import GraphicRequestWidget from "../components/chatter/GraphicRequestWidget";
import { usePayments } from "@/hooks/usePayments";
import KpiCard from "../components/chatters/KpiCard";
import PeriodSelector, { getPeriodDates } from "../components/chatters/PeriodSelector";
import PerformanceAlerts from "../components/chatters/PerformanceAlerts";
import RecentPaymentsPanel from "../components/chatters/RecentPaymentsPanel";
import ChatterLeaderboardTable from "../components/chatters/ChatterLeaderboardTable";
import TodayNotesWidget from "../components/dashboard/TodayNotesWidget";
import ShiftOverviewWidget from "../components/dashboard/ShiftOverviewWidget";
import RecentCustomersWidget from "../components/dashboard/RecentCustomersWidget";
import TodayPerformanceWidget from "../components/dashboard/TodayPerformanceWidget";

// ─── Admin view ────────────────────────────────────────────────────────────
function AdminChattingSpace({ currentUser }) {
  const [selectedChatter, setSelectedChatter] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [period, setPeriod] = useState({ key: "this_month" });

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
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 5000),
    staleTime: 60000,
  });
  const { data: payments = [] } = usePayments();
  const { data: allShifts = [] } = useQuery({
    queryKey: ["all-chatter-shifts"],
    queryFn: () => base44.entities.ChatterShift.list("-date", 2000),
    staleTime: 15000,
  });
  const { data: payouts = [] } = useQuery({
    queryKey: ["chatterPayouts"],
    queryFn: () => base44.entities.ChatterPayout.list("-period", 500),
    staleTime: 60000,
  });

  const chatters = useMemo(() => users.filter((u) => {
    const uRoles = u.roles?.length > 0 ? u.roles : u.role ? [u.role] : [];
    return uRoles.includes("chatter") || u.allowed_pages?.includes("ChatterPortal");
  }), [users]);

  const { start, end, prevStart, prevEnd } = getPeriodDates(period);

  const periodPayments = useMemo(() =>
    payments.filter(p => { const d = p.payment_date || p.created_date?.split("T")[0]; return d && d >= start && d <= end; }),
    [payments, start, end]);

  const prevPayments = useMemo(() => {
    if (!prevStart || !prevEnd) return [];
    return payments.filter(p => { const d = p.payment_date || p.created_date?.split("T")[0]; return d && d >= prevStart && d <= prevEnd; });
  }, [payments, prevStart, prevEnd]);

  const periodShifts = useMemo(() => allShifts.filter(s => s.date >= start && s.date <= end), [allShifts, start, end]);

  const totalRevenue = periodPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const prevRevenue = prevPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const revTrendPct = prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : null;

  const activeChatters = chatters.filter(c =>
    periodShifts.some(s => s.chatter_email === c.email) || periodPayments.some(p => p.chatter_email === c.email)
  );
  const totalPaymentCount = periodPayments.length;
  const revPerChatter = activeChatters.length > 0 ? Math.round(totalRevenue / activeChatters.length) : 0;

  const paydayCustomers = customers.filter(
    c => c.pay_day_of_month === new Date().getDate() && c.status !== "blocked" && c.status !== "inactive"
  );

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  function getStats(email) {
    const ps = payments.filter((p) => p.chatter_email === email);
    const month = ps.filter((p) => (p.payment_date || p.created_date?.split("T")[0]) >= monthStart);
    return { payments: ps, monthTotal: month.reduce((s, p) => s + (p.amount || 0), 0) };
  }

  if (selectedChatter) {
    return (
      <div className="min-h-screen bg-[#1a1a1a]">
        <div className="bg-[#1e1e1e] border-b border-white/10 px-6 py-3 flex items-center gap-3">
          <button
            onClick={() => setSelectedChatter(null)}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#C9A227] transition-colors font-medium">
            ← Zpět na přehled
          </button>
          <span className="text-white/10">|</span>
          <span className="text-xs text-slate-500">Viewing as: <span className="font-semibold text-[#C9A227]">{selectedChatter.nickname || selectedChatter.full_name}</span></span>
        </div>
        <ChatterView currentUser={selectedChatter} isAdminView={true} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      {/* Page header bar */}
      <div className="bg-[#1e1e1e] border-b border-white/10 px-6 pt-6 pb-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-[#C9A227] text-xs font-semibold uppercase tracking-widest mb-1">Admin</p>
            <h1 className="text-2xl font-bold text-slate-100">Chatting Space</h1>
          </div>
          {activeTab === "dashboard" && <PeriodSelector period={period} onChange={setPeriod} />}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-6 pb-12 space-y-6">
        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1 border border-white/10 w-fit">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "dashboard" ? "bg-[#C9A227] text-white shadow" : "text-slate-400 hover:text-slate-200"}`}>
            <BarChart2 className="w-4 h-4" /> Dashboard
          </button>
          <button
            onClick={() => setActiveTab("chatters")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "chatters" ? "bg-[#C9A227] text-white shadow" : "text-slate-400 hover:text-slate-200"}`}>
            <Users className="w-4 h-4" /> Chatters
            {chatters.length > 0 && (
              <span className="bg-white/10 text-slate-300 text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[20px] text-center">{chatters.length}</span>
            )}
          </button>
        </div>

        {/* ── Dashboard tab ── */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KpiCard label="Total Revenue" value={totalRevenue.toLocaleString("cs-CZ") + " CZK"} highlight trend={revTrendPct} trendLabel={revTrendPct !== null ? `${revTrendPct > 0 ? "+" : ""}${revTrendPct}% vs prev period` : "No comparison data"} />
              <KpiCard label="Active Chatters" value={`${activeChatters.length} / ${chatters.length}`} sub="with shift or payment" />
              <KpiCard label="Total Payments" value={totalPaymentCount.toString()} sub={totalPaymentCount > 0 ? `avg ${Math.round(totalRevenue / totalPaymentCount).toLocaleString("cs-CZ")} CZK` : "No payments"} />
              <KpiCard label="Revenue / Chatter" value={activeChatters.length > 0 ? revPerChatter.toLocaleString("cs-CZ") + " CZK" : "—"} sub={activeChatters.length > 0 ? `across ${activeChatters.length} active` : "No active chatters"} />
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <TodayNotesWidget currentUser={currentUser} paydayCustomers={paydayCustomers} models={models} />
              <PerformanceAlerts chatters={chatters} payments={payments} shifts={allShifts} periodDates={{ start, end }} />
            </div>

            <TodayPerformanceWidget payments={payments} chatters={chatters} models={models} />
            <ChatterLeaderboardTable chatters={chatters} payments={periodPayments} prevPayments={prevPayments} shifts={periodShifts} models={models} payouts={payouts} />
            <RecentPaymentsPanel payments={payments} />
            <RecentCustomersWidget customers={customers} />
            <ShiftOverviewWidget users={users} />
          </div>
        )}

        {/* ── Chatters tab ── */}
        {activeTab === "chatters" && (
          <div className="space-y-5">
            {chatters.length > 0 && <AdminShiftCalendar chatters={chatters} />}

            {chatters.length === 0 ? (
              <div className="text-center py-20 text-slate-600">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Zatím žádní chatteři</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {chatters.map((u, i) => {
                  const stats = getStats(u.email);
                  const initials = (u.nickname || u.full_name || "?")[0].toUpperCase();
                  const monthlyRevenuePct = stats.monthTotal > 0 ? Math.min(100, Math.round((stats.monthTotal / 150000) * 100)) : 0;
                  return (
                    <button
                      key={u.id}
                      onClick={() => setSelectedChatter(u)}
                      className="group bg-[#1e1e1e] rounded-2xl border border-white/10 p-5 flex flex-col gap-4 hover:border-[#C9A227]/40 hover:shadow-lg hover:shadow-black/30 transition-all text-left card-hover">
                      {/* Top: avatar + name */}
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#C9A227] to-[#A8841C] flex items-center justify-center text-white text-base font-bold flex-shrink-0 shadow-sm shadow-amber-900/30">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-100 truncate">{u.nickname || u.full_name}</p>
                          <p className="text-xs text-slate-500 truncate">{u.email}</p>
                        </div>
                        <span className="text-xs text-[#C9A227] opacity-0 group-hover:opacity-100 transition-opacity font-medium">Zobrazit →</span>
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 rounded-xl px-3 py-2.5">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Tento měsíc</p>
                          <p className="text-sm font-bold text-slate-100">{stats.monthTotal.toLocaleString()} Kč</p>
                        </div>
                        <div className="bg-white/5 rounded-xl px-3 py-2.5">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Plateb celkem</p>
                          <p className="text-sm font-bold text-slate-100">{stats.payments.length}</p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[10px] text-slate-500">Měsíční cíl (150 000 Kč)</p>
                          <p className="text-[10px] font-semibold text-[#C9A227]">{monthlyRevenuePct}%</p>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#C9A227] to-[#e8c84a] rounded-full transition-all"
                            style={{ width: `${monthlyRevenuePct}%` }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
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

  const { data: payments = [] } = useQuery({
    queryKey: ["chatter-payments", email],
    queryFn: () => base44.entities.Payment.filter({ chatter_email: email }, "-created_date", 5000),
    enabled: !!email,
    staleTime: 30000
  });

  const { data: payouts = [] } = useQuery({
    queryKey: ["chatterPayouts", email],
    queryFn: () => base44.entities.ChatterPayout.filter({ chatter_email: email }),
    enabled: !!email,
    staleTime: 30000
  });

  const { data: rules = [] } = useQuery({
    queryKey: ["chatter-rules", email],
    queryFn: () => base44.entities.ChatterPerformanceRule.filter({ chatter_email: email }),
    enabled: !!email,
    staleTime: 60000
  });

  const { data: dailyPerf = [] } = useQuery({
    queryKey: ["chatter-daily-perf", email],
    queryFn: () => base44.entities.ChatterDailyPerformance.filter({ chatter_email: email }),
    enabled: !!email,
    staleTime: 30000
  });

  const { data: notes = [], refetch: refetchNotes } = useQuery({
    queryKey: ["coach-notes", email],
    queryFn: () => base44.entities.ChatterNote.filter({ chatter_email: email }, "-note_date"),
    enabled: !!email,
    staleTime: 30000
  });

  const activeRule = rules.find((r) => r.is_active) || null;
  const tiers = DEFAULT_TIERS;

  const hoursMap = {};
  dailyPerf.forEach((d) => { hoursMap[d.date] = d.hours_worked || 0; });

  const todayPayments = payments.filter((p) => (p.payment_date || p.created_date?.split("T")[0]) === today);
  const monthPayments = payments.filter((p) => (p.payment_date || p.created_date?.split("T")[0]) >= monthStart);
  const todayRevenue = todayPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const monthRevenue = monthPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const hoursToday = hoursMap[today] || 0;

  const displayName = nickname || currentUser?.full_name?.split(" ")[0] || "";

  const handleAddNote = async (content, extra = {}) => {
    await base44.entities.ChatterNote.create({
      chatter_email: email,
      content,
      note_date: extra.note_date || today,
      customer_name: extra.customer_name || undefined,
      amount: extra.amount || undefined,
      account: extra.account || undefined,
      account_name: extra.account_name || undefined,
      model_id: extra.model_id || undefined,
      model_name: extra.model_name || undefined,
    });
    refetchNotes();
  };

  const handleDeleteNote = async (id) => {
    await base44.entities.ChatterNote.delete(id);
    refetchNotes();
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      {showNicknameModal && (
        <NicknameSetupModal
          user={currentUser}
          onSaved={(n) => { setNickname(n); setShowNicknameModal(false); }} />
      )}

      {/* Hero */}
      <div className="bg-[#1e1e1e] border-b border-white/10 px-6 pt-6 pb-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <p className="text-[#C9A227] text-xs font-semibold uppercase tracking-widest">Chatting Space</p>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9A227] to-[#A8841C] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {(displayName || "?")[0].toUpperCase()}
            </div>
            <p className="text-slate-200 text-sm font-semibold">{displayName}</p>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 lg:px-6 pt-6 pb-12 space-y-4">

        {/* Notes + Onboarding link — 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CoachNotes
            notes={notes}
            chatterEmail={email}
            onAdd={handleAddNote}
            onDelete={handleDeleteNote} />

          <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-6 flex flex-col justify-center">
            <OnboardingLinkForm models={models.filter((m) => {
              const ids = currentUser?.assigned_model_ids || (currentUser?.assigned_model ? [currentUser.assigned_model] : []);
              return ids.length === 0 || ids.includes(m.id);
            })} />
          </div>
        </div>

        {/* Dnešní výkonnost + Výplata — side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl overflow-hidden">
            <TierLadder
              todayRevenue={todayRevenue}
              hoursWorked={hoursToday}
              dailyGoalAmount={activeRule?.daily_goal_amount || 0}
              dailyGoalEnabled={!!activeRule?.daily_goal_enabled}
              tiers={tiers}
              email={email} />
          </div>

          <ChatterPayWidget
            chatterEmail={email}
            hoursWorked={hoursToday}
            totalChatted={todayRevenue}
            monthPayments={monthPayments}
            isAdmin={false}
            showWorkSession={true} />
        </div>

        {/* Monthly pace */}
        <MonthlyPaceCard
          monthRevenue={monthRevenue}
          monthlyGoalAmount={activeRule?.monthly_goal_amount || 0}
          monthlyGoalEnabled={!!activeRule?.monthly_goal_enabled} />

        {/* Today's payments + Graphic Requests — side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <TodayPaymentsWidget payments={payments} />
          <GraphicRequestWidget
            chatterEmail={email}
            chatterName={displayName}
            models={models} />
        </div>

        {/* Shift calendar */}
        <ChatterShiftPicker email={email} name={displayName} />

        {/* Today stats + Recent payments */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <StatsCard
            todayRevenue={todayRevenue}
            hoursWorked={hoursToday}
            nextTierRevenue={5000} />
          <RecentPaymentsCard payments={payments} />
        </div>

        {/* Customer Scraper */}
        <ChatterScraperEmbed chatterEmail={email} />

        {/* Chatter's customers */}
        <ChatterCustomersList
          chatterEmail={email}
          assignedModelIds={(currentUser?.assigned_model_ids || (currentUser?.assigned_model ? [currentUser.assigned_model] : [])).filter(id => id != null && id !== "")} />
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────
export default function ChatterPortal({ currentUser }) {
  const roles = currentUser?.roles?.length > 0 ? currentUser.roles : currentUser?.role ? [currentUser.role] : [];
  const isChatter = roles.includes("chatter");
  const isAdmin = roles.includes("admin");
  if (isAdmin && !isChatter) return <AdminChattingSpace currentUser={currentUser} />;
  return <ChatterView currentUser={currentUser} />;
}