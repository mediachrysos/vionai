import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Settings } from "lucide-react";
import DayCard from "../components/social/DayCard";
import DayDetailModal from "../components/social/DayDetailModal";
import AdminProgramEditor from "../components/social/AdminProgramEditor";

const DAYS = [
  { key: "mon", label: "Pondělí", short: "Po" },
  { key: "tue", label: "Úterý", short: "Út" },
  { key: "wed", label: "Středa", short: "St" },
  { key: "thu", label: "Čtvrtek", short: "Čt" },
  { key: "fri", label: "Pátek", short: "Pá" },
  { key: "sat", label: "Sobota", short: "So" },
  { key: "sun", label: "Neděle", short: "Ne" },
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
  const qc = useQueryClient();

  const isAdmin = currentUser?.role === "admin";
  const today = new Date().toISOString().split("T")[0];

  const { data: programs = [] } = useQuery({
    queryKey: ["weeklyProgram", weekStart],
    queryFn: () => base44.entities.WeeklyProgram.filter({ week_start: weekStart }),
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ["daySubmissions", weekStart],
    queryFn: () => base44.entities.DaySubmission.filter({ week_start: weekStart }),
  });

  const program = programs[0] || null;

  const submissionMap = useMemo(() => {
    const m = {};
    submissions.forEach(s => { m[s.day_key] = s; });
    return m;
  }, [submissions]);

  // Calculate today's day key
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
    qc.invalidateQueries({ queryKey: ["daySubmissions", weekStart] });
  };

  const selectedDayInfo = selectedDay ? DAYS.find(d => d.key === selectedDay) : null;

  // Stats for admin
  const totalSubmitted = submissions.filter(s => s.status === "submitted").length;
  const totalApproved = submissions.filter(s => s.status === "approved").length;
  const totalRejected = submissions.filter(s => s.status === "rejected").length;

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Social Media Content</h1>
            <p className="text-sm text-gray-400 mt-0.5">Týdenní plán grafika</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowEditor(e => !e)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${showEditor ? "bg-[#faf6e6] border-[#C9A227] text-[#C9A227]" : "bg-white border-gray-200 text-gray-600 hover:border-[#C9A227]"}`}
            >
              <Settings className="w-4 h-4" />
              {showEditor ? "Zavřít editor" : "Editovat program"}
            </button>
          )}
        </div>

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
            Tento týden
          </button>
        </div>

        {/* Admin stats */}
        {isAdmin && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-center">
              <p className="text-xl font-bold text-amber-700">{totalSubmitted}</p>
              <p className="text-xs text-amber-600">Čeká na review</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-center">
              <p className="text-xl font-bold text-emerald-700">{totalApproved}</p>
              <p className="text-xs text-emerald-600">Schváleno</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-center">
              <p className="text-xl font-bold text-red-600">{totalRejected}</p>
              <p className="text-xs text-red-500">Zamítnuto</p>
            </div>
          </div>
        )}

        {/* Admin editor */}
        {isAdmin && showEditor && (
          <AdminProgramEditor weekStart={weekStart} program={program} onSaved={() => { refresh(); setShowEditor(false); }} />
        )}

        {/* Weekly grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DAYS.map(({ key, label }) => (
            <DayCard
              key={key}
              dayName={label}
              taskTitle={program?.[`${key}_title`]}
              taskDesc={program?.[`${key}_desc`]}
              submission={submissionMap[key]}
              isToday={todayDayKey === key}
              onClick={() => setSelectedDay(key)}
            />
          ))}
        </div>
      </div>

      {/* Day detail modal */}
      {selectedDay && (
        <DayDetailModal
          open={!!selectedDay}
          onClose={() => setSelectedDay(null)}
          dayName={selectedDayInfo?.label}
          dayKey={selectedDay}
          taskTitle={program?.[`${selectedDay}_title`]}
          taskDesc={program?.[`${selectedDay}_desc`]}
          submission={submissionMap[selectedDay]}
          weekStart={weekStart}
          isAdmin={isAdmin}
          onRefresh={refresh}
        />
      )}
    </div>
  );
}