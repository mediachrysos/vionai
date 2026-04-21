import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Settings } from "lucide-react";
import DayCard from "../components/social/DayCard";
import DayDetailModal from "../components/social/DayDetailModal";
import AdminProgramEditor from "../components/social/AdminProgramEditor";
import DashboardManager from "../components/social/DashboardManager";

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
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function addWeeks(weekStart, n) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + n * 7);
  return d.toISOString().split("T")[0];
}

function formatWeekLabel(weekStart) {
  const d = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return `${d.toLocaleDateString("cs-CZ", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("cs-CZ", { day: "numeric", month: "short", year: "numeric" })}`;
}

export default function SocialMediaContent({ currentUser }) {
  const [weekStart, setWeekStart] = useState(() => getMondayOf(new Date()));
  const [selectedDay, setSelectedDay] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showDashboardManager, setShowDashboardManager] = useState(false);
  const [selectedDashboardId, setSelectedDashboardId] = useState(null);
  const qc = useQueryClient();

  const isAdmin = currentUser?.role === "admin";
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

  // Fetch dashboards
  const { data: dashboards = [], refetch: refetchDashboards } = useQuery({
    queryKey: ["socialDashboards"],
    queryFn: () => base44.entities.SocialDashboard.list("order", 50),
    staleTime: 30000,
    enabled: isAdmin,
  });

  // Auto-select first dashboard
  useEffect(() => {
    if (isAdmin && dashboards.length > 0 && !selectedDashboardId) {
      setSelectedDashboardId(dashboards[0].id);
    }
  }, [dashboards, isAdmin, selectedDashboardId]);

  // Active dashboard & its designer
  const activeDashboard = dashboards.find(d => d.id === selectedDashboardId) || null;
  const activeDesignerEmail = isAdmin
    ? (activeDashboard?.designer_email || null)
    : myEmail;
  // For admin: we can always show a calendar — use dashboard_id as the program key when no designer assigned
  const programQueryKey = isAdmin && activeDashboard
    ? (activeDashboard.designer_email || `dashboard:${selectedDashboardId}`)
    : activeDesignerEmail;

  const { data: models = [] } = useQuery({
    queryKey: ["models"],
    queryFn: () => base44.entities.Model.list(),
    staleTime: 120000,
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["weeklyProgram", weekStart, programQueryKey],
    queryFn: () => {
      const filter = { week_start: weekStart };
      if (activeDesignerEmail) filter.designer_email = activeDesignerEmail;
      else filter.designer_email = `dashboard:${selectedDashboardId}`;
      return base44.entities.WeeklyProgram.filter(filter);
    },
    enabled: isAdmin ? !!selectedDashboardId : !!activeDesignerEmail,
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ["daySubmissions", weekStart, programQueryKey],
    queryFn: () => {
      const filter = { week_start: weekStart };
      if (activeDesignerEmail) filter.designer_email = activeDesignerEmail;
      else filter.designer_email = `dashboard:${selectedDashboardId}`;
      return base44.entities.DaySubmission.filter(filter);
    },
    enabled: isAdmin ? !!selectedDashboardId : !!activeDesignerEmail,
  });

  const program = programs[0] || null;

  const submissionMap = useMemo(() => {
    const m = {};
    submissions.forEach(s => { m[s.day_key] = s; });
    return m;
  }, [submissions]);

  const todayDayKey = useMemo(() => {
    const todayDate = new Date();
    const todayWeekStart = getMondayOf(todayDate);
    if (todayWeekStart !== weekStart) return null;
    const jsDay = todayDate.getDay();
    const idx = jsDay === 0 ? 6 : jsDay - 1;
    return DAYS[idx]?.key || null;
  }, [weekStart]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["weeklyProgram", weekStart, programQueryKey] });
    qc.invalidateQueries({ queryKey: ["daySubmissions", weekStart, programQueryKey] });
  };

  // Email to use when saving program/submissions (fallback for dashboards without designer)
  const effectiveDesignerEmail = activeDesignerEmail || `dashboard:${selectedDashboardId}`;

  const selectedDayInfo = selectedDay ? DAYS.find(d => d.key === selectedDay) : null;

  if (!isAdmin && !myEmail) return null;

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Social Media Content</h1>
            <p className="text-sm text-gray-400 mt-0.5">Weekly Designer Schedule</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && activeDashboard && (
              <button
                onClick={() => { setShowEditor(e => !e); setShowDashboardManager(false); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${showEditor ? "bg-[#faf6e6] border-[#C9A227] text-[#C9A227]" : "bg-white border-gray-200 text-gray-600 hover:border-[#C9A227]"}`}
              >
                <Settings className="w-4 h-4" />
                {showEditor ? "Zavřít editor" : "Editovat program"}
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => { setShowDashboardManager(e => !e); setShowEditor(false); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${showDashboardManager ? "bg-violet-50 border-violet-300 text-violet-700" : "bg-white border-gray-200 text-gray-600 hover:border-violet-300"}`}
              >
                <Settings className="w-4 h-4" />
                Dashboardy
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
                    : "bg-white border-gray-200 text-gray-600 hover:border-[#C9A227]"
                }`}
              >
                <span>{db.name}</span>
                {db.designer_name && (
                  <span className={`text-xs mt-0.5 ${selectedDashboardId === db.id ? "text-white/70" : "text-gray-400"}`}>
                    🎨 {db.designer_name}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {isAdmin && dashboards.length === 0 && !showDashboardManager && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
            Žádné dashboardy. Klikněte na <strong>Dashboardy</strong> a vytvořte první.
          </div>
        )}

        {/* No designer assigned — info only */}
        {isAdmin && activeDashboard && !activeDashboard.designer_email && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-500">
            Žádný grafik není přiřazen — program je viditelný pouze pro adminy.
          </div>
        )}

        {/* Week nav */}
        {(activeDesignerEmail || isAdmin) && (
          <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 px-4 py-3">
            <button onClick={() => setWeekStart(w => addWeeks(w, -1))} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <p className="flex-1 text-center text-sm font-semibold text-gray-700">{formatWeekLabel(weekStart)}</p>
            <button onClick={() => setWeekStart(w => addWeeks(w, 1))} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
            <button onClick={() => setWeekStart(getMondayOf(new Date()))} className="text-xs text-[#C9A227] font-medium px-2 py-1 rounded-lg hover:bg-[#faf6e6]">
              Tento týden
            </button>
          </div>
        )}

        {/* Admin editor */}
        {isAdmin && showEditor && activeDashboard && (
          <AdminProgramEditor
            weekStart={weekStart}
            program={program}
            models={models}
            designerEmail={effectiveDesignerEmail}
            designerName={activeDashboard?.designer_name || activeDashboard?.name}
            onSaved={() => { refresh(); setShowEditor(false); }}
          />
        )}

        {/* Weekly grid */}
        {(isAdmin ? !!activeDashboard : !!activeDesignerEmail) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {DAYS.map(({ key, label }) => (
              <DayCard
                key={key}
                dayName={label}
                tasks={program?.[`${key}_tasks`] || []}
                submission={submissionMap[key]}
                isToday={todayDayKey === key}
                onClick={() => setSelectedDay(key)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400 text-sm">
            {isAdmin ? "Vyberte dashboard." : "Nemáte přiřazen žádný program."}
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
          designerEmail={effectiveDesignerEmail}
          isAdmin={isAdmin}
          onRefresh={refresh}
          models={models}
        />
      )}
    </div>
  );
}