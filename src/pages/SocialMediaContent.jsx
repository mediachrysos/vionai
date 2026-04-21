import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Settings } from "lucide-react";
import DayCard from "../components/social/DayCard";
import DayDetailModal from "../components/social/DayDetailModal";
import AdminProgramEditor from "../components/social/AdminProgramEditor";

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
  const [selectedDesignerEmail, setSelectedDesignerEmail] = useState(null);
  const qc = useQueryClient();

  const isAdmin = currentUser?.role === "admin";
  const myEmail = currentUser?.email;

  // For non-admins, always view their own calendar
  const activeDesignerEmail = isAdmin ? selectedDesignerEmail : myEmail;

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

  // Auto-select first designer
  React.useEffect(() => {
    if (isAdmin && designers.length > 0 && !selectedDesignerEmail) {
      setSelectedDesignerEmail(designers[0].email);
    }
  }, [designers, isAdmin, selectedDesignerEmail]);

  const { data: models = [] } = useQuery({
    queryKey: ["models"],
    queryFn: () => base44.entities.Model.list(),
    staleTime: 120000,
  });

  const { data: programs = [] } = useQuery({
    queryKey: ["weeklyProgram", weekStart, activeDesignerEmail],
    queryFn: () => base44.entities.WeeklyProgram.filter({
      week_start: weekStart,
      designer_email: activeDesignerEmail,
    }),
    enabled: !!activeDesignerEmail,
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ["daySubmissions", weekStart, activeDesignerEmail],
    queryFn: () => base44.entities.DaySubmission.filter({
      week_start: weekStart,
      designer_email: activeDesignerEmail,
    }),
    enabled: !!activeDesignerEmail,
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
    qc.invalidateQueries({ queryKey: ["weeklyProgram", weekStart, activeDesignerEmail] });
    qc.invalidateQueries({ queryKey: ["daySubmissions", weekStart, activeDesignerEmail] });
  };

  const selectedDayInfo = selectedDay ? DAYS.find(d => d.key === selectedDay) : null;

  // Non-admin with no program assigned yet
  if (!isAdmin && !myEmail) return null;

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Social Media Content</h1>
            <p className="text-sm text-gray-400 mt-0.5">Weekly Designer Schedule</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowEditor(e => !e)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${showEditor ? "bg-[#faf6e6] border-[#C9A227] text-[#C9A227]" : "bg-white border-gray-200 text-gray-600 hover:border-[#C9A227]"}`}
            >
              <Settings className="w-4 h-4" />
              {showEditor ? "Close editor" : "Edit program"}
            </button>
          )}
        </div>

        {/* Admin: designer tabs */}
        {isAdmin && designers.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {designers.map(d => (
              <button
                key={d.email}
                onClick={() => { setSelectedDesignerEmail(d.email); setShowEditor(false); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  selectedDesignerEmail === d.email
                    ? "bg-[#C9A227] text-white border-[#C9A227] shadow-sm"
                    : "bg-white border-gray-200 text-gray-600 hover:border-[#C9A227]"
                }`}
              >
                {d.full_name || d.email}
              </button>
            ))}
          </div>
        )}

        {isAdmin && designers.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
            Žádní grafici nemají přístup k Social Media. Přidejte jim stránku v Admin → Uživatelé.
          </div>
        )}

        {/* Week nav */}
        <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 px-4 py-3">
          <button onClick={() => setWeekStart(w => addWeeks(w, -1))} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <p className="flex-1 text-center text-sm font-semibold text-gray-700">{formatWeekLabel(weekStart)}</p>
          <button onClick={() => setWeekStart(w => addWeeks(w, 1))} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>
          <button onClick={() => setWeekStart(getMondayOf(new Date()))} className="text-xs text-[#C9A227] font-medium px-2 py-1 rounded-lg hover:bg-[#faf6e6]">
            This week
          </button>
        </div>

        {/* Admin editor */}
        {isAdmin && showEditor && activeDesignerEmail && (
          <AdminProgramEditor
            weekStart={weekStart}
            program={program}
            models={models}
            designerEmail={activeDesignerEmail}
            designerName={designers.find(d => d.email === activeDesignerEmail)?.full_name || activeDesignerEmail}
            onSaved={() => { refresh(); setShowEditor(false); }}
          />
        )}

        {/* Weekly grid */}
        {activeDesignerEmail ? (
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
            {isAdmin ? "Vyberte grafika výše." : "Nemáte přiřazen žádný program."}
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
          designerEmail={activeDesignerEmail}
          isAdmin={isAdmin}
          onRefresh={refresh}
          models={models}
        />
      )}
    </div>
  );
}