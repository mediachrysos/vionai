import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Settings, Copy } from "lucide-react";
import DayCard from "../components/social/DayCard";
import DayDetailModal from "../components/social/DayDetailModal";
import AdminProgramEditor from "../components/social/AdminProgramEditor";
import DashboardManager from "../components/social/DashboardManager";
import WorkSessionTracker from "../components/social/WorkSessionTracker";
import DesignerPayWidget from "../components/social/DesignerPayWidget";
import GraphicRequestsPanel from "../components/social/GraphicRequestsPanel";

const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

function getMondayOf(date) {
  const d = new Date(date);
  // Use local date to avoid timezone issues
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  // Return local date string to avoid UTC offset shifting the day
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addWeeks(weekStart, n) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + n * 7);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatWeekLabel(weekStart) {
  const d = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
}

// All designers share the same weekly tasks / submissions — one common space for content,
// while each designer still has their own dashboard for time tracking and salary.
const SHARED_TASKS_KEY = "shared_graphic_space";

export default function SocialMediaContent({ currentUser }) {
  const [weekStart, setWeekStart] = useState(() => getMondayOf(new Date()));
  const [selectedDay, setSelectedDay] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showDashboardManager, setShowDashboardManager] = useState(false);
  const [selectedDashboardId, setSelectedDashboardId] = useState(null);
  const qc = useQueryClient();

  const isAdmin = currentUser?.role === "admin" || (currentUser?.roles || []).includes("admin");
  const myEmail = currentUser?.email;

  // Fetch all users (admin only)
  const { data: allUsers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
    staleTime: 120000,
    enabled: isAdmin,
  });

  // Designers = users with role "grafik" OR SocialMediaContent in allowed_pages
  const designers = useMemo(() => {
    if (!isAdmin) return [];
    return allUsers.filter(u =>
      u.role !== "admin" && (
        u.role === "grafik" ||
        (u.allowed_pages || []).includes("SocialMediaContent")
      )
    );
  }, [allUsers, isAdmin]);

  // Fetch dashboards — needed by both admin and designer
  const { data: dashboards = [], refetch: refetchDashboards } = useQuery({
    queryKey: ["socialDashboards"],
    queryFn: () => base44.entities.SocialDashboard.list("order", 50),
    staleTime: 30000,
  });

  // Auto-select first dashboard
  useEffect(() => {
    if (dashboards.length > 0 && !selectedDashboardId) {
      if (isAdmin) {
        setSelectedDashboardId(dashboards[0].id);
      } else {
        // For designer: find their dashboard
        const mine = dashboards.find(d => d.designer_email === myEmail);
        if (mine) setSelectedDashboardId(mine.id);
      }
    }
  }, [dashboards, isAdmin, myEmail, selectedDashboardId]);

  // Active dashboard & its designer
  const activeDashboard = dashboards.find(d => d.id === selectedDashboardId) || null;
  const activeDesignerEmail = isAdmin
    ? (activeDashboard?.designer_email || null)
    : myEmail;

  const { data: models = [] } = useQuery({
    queryKey: ["models"],
    queryFn: () => base44.entities.Model.list(),
    staleTime: 120000,
  });

  // Tasks & submissions are shared by ALL designers — fetched via backend to bypass RLS for non-admins
  const { data: sharedData = {} } = useQuery({
    queryKey: ["weeklyProgram", weekStart],
    queryFn: async () => {
      const res = await base44.functions.invoke("getSharedProgram", { week_start: weekStart });
      return res.data || {};
    },
    staleTime: 0,
    retry: 1,
  });

  const programs = sharedData.programs || [];
  const submissions = sharedData.submissions || [];

  // Take the most recently updated program in case of duplicates
  const program = programs.length > 0
    ? [...programs].sort((a, b) => new Date(b.updated_date || 0) - new Date(a.updated_date || 0))[0]
    : null;

  const submissionMap = useMemo(() => {
    const m = {};
    submissions.forEach(s => { m[s.day_key] = s; });
    return m;
  }, [submissions]);

  // Graphic requests — shared/default for everyone in the graphic space, no per-designer filtering
  const { data: graphicRequests = [] } = useQuery({
    queryKey: ["graphic-requests-all"],
    queryFn: () => base44.entities.GraphicRequest.list("-created_date", 200),
    staleTime: 30000,
  });

  // Map day key → ISO date for the current week (local dates, no UTC shift)
  const dayDateMap = useMemo(() => {
    const map = {};
    DAYS.forEach(({ key }, idx) => {
      const d = new Date(weekStart + "T12:00:00");
      d.setDate(d.getDate() + idx);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      map[key] = `${yyyy}-${mm}-${dd}`;
    });
    return map;
  }, [weekStart]);

  // Group graphic requests by request_date
  const requestsByDate = useMemo(() => {
    const map = {};
    graphicRequests.forEach(r => {
      if (!r.request_date) return;
      if (!map[r.request_date]) map[r.request_date] = [];
      map[r.request_date].push(r);
    });
    return map;
  }, [graphicRequests]);

  const todayDayKey = useMemo(() => {
    const todayDate = new Date();
    const todayWeekStart = getMondayOf(todayDate);
    if (todayWeekStart !== weekStart) return null;
    const jsDay = todayDate.getDay();
    const idx = jsDay === 0 ? 6 : jsDay - 1;
    return DAYS[idx]?.key || null;
  }, [weekStart]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["weeklyProgram", weekStart] });
  };

  // Auto-duplicate: when navigating forward to a week with no shared program, copy as draft (admin only)
  const handleWeekChange = async (newWeekStart, prevWeekStart) => {
    setWeekStart(newWeekStart);
    if (!isAdmin) return; // Only admins can create/duplicate programs
    if (newWeekStart <= prevWeekStart) return;
    const existingRes = await base44.functions.invoke("getSharedProgram", { week_start: newWeekStart });
    if ((existingRes.data?.programs || []).length > 0) return;
    const prevRes = await base44.functions.invoke("getSharedProgram", { week_start: prevWeekStart });
    const prevPrograms = prevRes.data?.programs || [];
    if (prevPrograms.length === 0) return;
    const prev = prevPrograms[0];
    const DAYS_KEYS = ["mon","tue","wed","thu","fri","sat","sun"];
    const data = { week_start: newWeekStart, designer_email: SHARED_TASKS_KEY, is_draft: true };
    DAYS_KEYS.forEach(key => { data[`${key}_tasks`] = (prev[`${key}_tasks`] || []).map(t => ({ ...t })); });
    await base44.entities.WeeklyProgram.create(data);
    setTimeout(() => {
      qc.invalidateQueries({ queryKey: ["weeklyProgram"] });
    }, 300);
  };

  // Email to use when saving program/submissions (fallback for dashboards without designer)
  const effectiveDesignerEmail = activeDesignerEmail || `dashboard:${selectedDashboardId}`;

  const selectedDayInfo = selectedDay ? DAYS.find(d => d.key === selectedDay) : null;

  if (!isAdmin && !myEmail) return null;

  return (
    <div className="min-h-screen bg-[#1a1a1a] p-4 sm:p-6 pt-16 lg:pt-6 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-100">Graphic Space</h1>
            <p className="text-sm text-slate-500 mt-0.5">Weekly Designer Schedule</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && activeDashboard && (
              <button
                onClick={() => { setShowEditor(e => !e); setShowDashboardManager(false); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${showEditor ? "bg-amber-950/50 border-[#C9A227] text-[#C9A227]" : "bg-[#1e1e1e] border-white/10 text-slate-400 hover:border-[#C9A227]/40"}`}
              >
                <Settings className="w-4 h-4" />
                {showEditor ? "Close editor" : "Edit program"}
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => { setShowDashboardManager(e => !e); setShowEditor(false); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${showDashboardManager ? "bg-violet-950/50 border-violet-700/40 text-violet-300" : "bg-[#1e1e1e] border-white/10 text-slate-400 hover:border-violet-700/40"}`}
              >
                <Settings className="w-4 h-4" />
                Dashboards
              </button>
            )}
          </div>
        </div>

        {/* Dashboard manager */}
        {isAdmin && showDashboardManager && (
          <DashboardManager
            dashboards={dashboards}
            designers={designers}
            onRefresh={() => { refetchDashboards(); setShowDashboardManager(false); }}
          />
        )}

        {/* Admin: dashboard tabs */}
        {isAdmin && dashboards.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {dashboards.map(db => (
              <button
                key={db.id}
                onClick={() => { setSelectedDashboardId(db.id); setShowEditor(false); }}
                className={`flex flex-col items-start px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  selectedDashboardId === db.id
                    ? "bg-[#C9A227] text-white border-[#C9A227] shadow-sm"
                    : "bg-[#1e1e1e] border-white/10 text-slate-400 hover:border-[#C9A227]/40"
                }`}
              >
                <span>{db.name}</span>
                {db.designer_name && (
                  <span className={`text-xs mt-0.5 ${selectedDashboardId === db.id ? "text-white/70" : "text-slate-600"}`}>
                    🎨 {db.designer_name}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {isAdmin && dashboards.length === 0 && !showDashboardManager && (
          <div className="bg-amber-950/30 border border-amber-700/30 rounded-xl px-4 py-3 text-sm text-amber-300">
            No dashboards. Click <strong>Dashboards</strong> to create the first one.
          </div>
        )}

        {/* No designer assigned — info only */}
        {isAdmin && activeDashboard && !activeDashboard.designer_email && (
          <div className="bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-500">
            No designer assigned — the program is visible to admins only.
          </div>
        )}

        {/* Week nav */}
        <div className="flex items-center gap-3 bg-[#1e1e1e] rounded-2xl border border-white/10 px-4 py-3">
          <button onClick={() => setWeekStart(w => addWeeks(w, -1))} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center">
            <ChevronLeft className="w-4 h-4 text-slate-400" />
          </button>
          <div className="flex-1 flex flex-col items-center">
            <p className="text-sm font-semibold text-slate-200">{formatWeekLabel(weekStart)}</p>
            {program?.is_draft && (
              <span className="text-[10px] text-amber-400 flex items-center gap-1 mt-0.5">
                <Copy className="w-2.5 h-2.5" /> návrh z minulého týdne
              </span>
            )}
          </div>
          <button onClick={() => { const next = addWeeks(weekStart, 1); handleWeekChange(next, weekStart); }} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center">
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
          <button onClick={() => setWeekStart(getMondayOf(new Date()))} className="text-xs text-[#C9A227] font-medium px-2 py-1 rounded-lg hover:bg-amber-950/30">
            This week
          </button>
        </div>

        {/* Admin editor */}
        {isAdmin && showEditor && activeDashboard && (
          <AdminProgramEditor
            weekStart={weekStart}
            program={program}
            models={models}
            designerEmail={SHARED_TASKS_KEY}
            isDraft={!!program?.is_draft}
            onSaved={() => { refresh(); }}
          />
        )}

        {/* Work tracker + Pay widget — shown when there's an active dashboard with a designer */}
        {activeDashboard && effectiveDesignerEmail && !effectiveDesignerEmail.startsWith("dashboard:") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <WorkSessionTracker
              designerEmail={effectiveDesignerEmail}
              dashboardId={activeDashboard.id}
              isAdmin={isAdmin}
            />
            <DesignerPayWidget
              designerEmail={effectiveDesignerEmail}
              dashboard={activeDashboard}
              isAdmin={isAdmin}
              onRateChange={refetchDashboards}
            />
          </div>
        )}

        {/* Weekly grid — always visible for designers (tasks are shared), admin needs a selected dashboard */}
        {(!!activeDashboard || !isAdmin) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {DAYS.map(({ key, label }) => (
              <DayCard
                key={key}
                dayName={label}
                tasks={program?.[`${key}_tasks`] || []}
                submission={submissionMap[key]}
                isToday={todayDayKey === key}
                isDraft={!!program?.is_draft}
                onClick={() => setSelectedDay(key)}
                graphicRequests={requestsByDate[dayDateMap[key]] || []}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-600 text-sm">
            Select a dashboard.
          </div>
        )}
      </div>

      {/* Day detail modal */}
      {selectedDay && (
        <DayDetailModal
          open={!!selectedDay}
          onClose={() => setSelectedDay(null)}
          dayName={selectedDayInfo?.label}
          dayKey={selectedDay}
          tasks={program?.[`${selectedDay}_tasks`] || []}
          submission={submissionMap[selectedDay]}
          weekStart={weekStart}
          designerEmail={SHARED_TASKS_KEY}
          isAdmin={isAdmin}
          onRefresh={refresh}
          models={models}
        />
      )}
    </div>
  );
}