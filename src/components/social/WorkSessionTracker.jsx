import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Square, Clock, Edit2, Check, X, History, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function minutesToDisplay(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function roundDownTo15(minutes) {
  return minutes;
}

function fmtTime(iso) {
  if (!iso) return "?";
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(dateStr) {
  if (!dateStr) return "?";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export default function WorkSessionTracker({ designerEmail, dashboardId, isAdmin }) {
  const qc = useQueryClient();
  const today = getToday();
  const [elapsed, setElapsed] = useState(0);
  const [editingSession, setEditingSession] = useState(null);
  const [editMinutes, setEditMinutes] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const todayKey = ["workSessions", designerEmail, dashboardId, today];
  const allKey = ["workSessionsAll", designerEmail, dashboardId];

  // Today's sessions (for timer)
  const { data: todaySessions = [] } = useQuery({
    queryKey: todayKey,
    queryFn: () => base44.entities.DesignerWorkSession.filter({
      designer_email: designerEmail,
      dashboard_id: dashboardId,
      date: today,
    }),
    refetchInterval: 30000,
    enabled: !!designerEmail && !!dashboardId,
  });

  // All sessions (for history view)
  const { data: allSessions = [] } = useQuery({
    queryKey: allKey,
    queryFn: () => base44.entities.DesignerWorkSession.filter({
      designer_email: designerEmail,
      dashboard_id: dashboardId,
    }),
    enabled: !!designerEmail && !!dashboardId && showHistory,
    staleTime: 30000,
  });

  const activeSession = todaySessions.find(s => s.is_active);
  const totalMinutes = todaySessions.reduce((sum, s) => sum + (s.minutes_worked || 0), 0);
  const liveMinutes = activeSession ? Math.floor(elapsed / 60) : 0;
  const roundedTotal = roundDownTo15(totalMinutes + liveMinutes);

  useEffect(() => {
    if (!activeSession) { setElapsed(0); return; }
    const start = new Date(activeSession.started_at).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 10000);
    return () => clearInterval(interval);
  }, [activeSession?.id]);

  const handleStart = async () => {
    await base44.entities.DesignerWorkSession.create({
      designer_email: designerEmail,
      dashboard_id: dashboardId,
      date: today,
      started_at: new Date().toISOString(),
      is_active: true,
      minutes_worked: 0,
    });
    qc.invalidateQueries({ queryKey: todayKey });
  };

  const handleStop = async () => {
    if (!activeSession) return;
    const rawMins = Math.floor((Date.now() - new Date(activeSession.started_at).getTime()) / 60000);
    await base44.entities.DesignerWorkSession.update(activeSession.id, {
      ended_at: new Date().toISOString(),
      is_active: false,
      minutes_worked: roundDownTo15(rawMins),
    });
    qc.invalidateQueries({ queryKey: todayKey });
    qc.invalidateQueries({ queryKey: allKey });
  };

  const handleEditSave = async (session) => {
    const mins = parseInt(editMinutes, 10);
    if (isNaN(mins) || mins < 0) return;
    await base44.entities.DesignerWorkSession.update(session.id, {
      minutes_worked: roundDownTo15(mins),
      is_active: false,
      ended_at: session.ended_at || new Date().toISOString(),
    });
    setEditingSession(null);
    qc.invalidateQueries({ queryKey: todayKey });
    qc.invalidateQueries({ queryKey: allKey });
  };

  const handleDelete = async (id) => {
    await base44.entities.DesignerWorkSession.delete(id);
    qc.invalidateQueries({ queryKey: todayKey });
    qc.invalidateQueries({ queryKey: allKey });
  };

  // Group history sessions by date (exclude active)
  const historyByDay = React.useMemo(() => {
    const past = allSessions.filter(s => !s.is_active);
    const grouped = {};
    past.forEach(s => {
      const d = s.date || today;
      if (!grouped[d]) grouped[d] = [];
      grouped[d].push(s);
    });
    // Sort dates descending
    return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0]));
  }, [allSessions, today]);

  // ── HISTORY VIEW ──
  if (showHistory) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowHistory(false)}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Work history
          </button>
          <span className="text-xs text-gray-400">{allSessions.filter(s => !s.is_active).length} sessions</span>
        </div>

        {/* Scrollable list — fixed height forces scroll */}
        <div style={{ maxHeight: "260px", overflowY: "auto" }} className="flex flex-col gap-3 pr-1">
          {historyByDay.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">No recorded sessions yet.</p>
          )}
          {historyByDay.map(([date, sessions]) => (
            <div key={date}>
              {/* Day label */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  {date === today ? "Today" : fmtDate(date)}
                </span>
                <span className="text-[11px] text-gray-400">
                  {minutesToDisplay(sessions.reduce((s, x) => s + (x.minutes_worked || 0), 0))}
                </span>
              </div>
              <div className="space-y-1">
                {sessions.map(s => (
                  <div key={s.id} className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                    {editingSession === s.id ? (
                      <>
                        <Input
                          value={editMinutes}
                          onChange={e => setEditMinutes(e.target.value)}
                          className="h-6 text-xs w-16 px-2"
                          type="number"
                          min="0"
                        />
                        <span className="text-gray-400 text-[10px]">min</span>
                        <button onClick={() => handleEditSave(s)} className="text-emerald-600 hover:text-emerald-800 ml-auto">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingSession(null)} className="text-gray-300 hover:text-gray-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-gray-400">{fmtTime(s.started_at)} – {fmtTime(s.ended_at)}</span>
                        <span className="font-semibold text-gray-700">{minutesToDisplay(s.minutes_worked || 0)}</span>
                        {isAdmin && (
                          <>
                            <button onClick={() => { setEditingSession(s.id); setEditMinutes(String(s.minutes_worked || 0)); }} className="text-gray-300 hover:text-amber-500 transition-colors">
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleDelete(s.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── TODAY VIEW (default) ──
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
            <Clock className="w-3.5 h-3.5 text-gray-500" />
          </div>
          <span className="text-sm font-semibold text-gray-800">Today's work</span>
        </div>
        <button
          onClick={() => setShowHistory(true)}
          className="text-gray-300 hover:text-gray-500 transition-colors"
          title="View full history"
        >
          <History className="w-4 h-4" />
        </button>
      </div>

      {/* Big time display */}
      <div className="flex flex-col items-center py-3">
        <span className="text-5xl font-extrabold tabular-nums tracking-tight" style={{ color: "#C9A227" }}>
          {minutesToDisplay(roundedTotal)}
        </span>
        {activeSession && (
          <span className="text-xs text-gray-400 mt-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Running since {fmtTime(activeSession.started_at)}
          </span>
        )}
      </div>

      {/* Start / Stop — designer only */}
      {!isAdmin && (
        !activeSession ? (
          <button
            onClick={handleStart}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors"
          >
            <Play className="w-4 h-4" /> Start working
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-xl py-2.5 transition-colors"
          >
            <Square className="w-4 h-4" /> Stop
          </button>
        )
      )}

      {/* Admin: stop active session + manage today sessions */}
      {isAdmin && (
        <div className="flex flex-col gap-2">
          {activeSession && (
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-gray-500">Running since {fmtTime(activeSession.started_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleStop}
                  className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <Square className="w-3 h-3" /> Stop
                </button>
                <button onClick={() => handleDelete(activeSession.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Today's finished sessions — admin can edit */}
          {todaySessions.filter(s => !s.is_active).map(s => (
            <div key={s.id} className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
              {editingSession === s.id ? (
                <>
                  <Input
                    value={editMinutes}
                    onChange={e => setEditMinutes(e.target.value)}
                    className="h-6 text-xs w-16 px-2"
                    type="number"
                    min="0"
                  />
                  <span className="text-gray-400 text-[10px]">min</span>
                  <button onClick={() => handleEditSave(s)} className="text-emerald-600 hover:text-emerald-800 ml-auto">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditingSession(null)} className="text-gray-300 hover:text-gray-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-gray-400">{fmtTime(s.started_at)} – {fmtTime(s.ended_at)}</span>
                  <span className="font-semibold text-gray-700">{minutesToDisplay(s.minutes_worked || 0)}</span>
                  <button onClick={() => { setEditingSession(s.id); setEditMinutes(String(s.minutes_worked || 0)); }} className="text-gray-300 hover:text-amber-500 transition-colors">
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          ))}

          {!activeSession && (
            <button
              onClick={handleStart}
              className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium rounded-xl py-2 transition-colors"
            >
              <Play className="w-3.5 h-3.5" /> Start session for designer
            </button>
          )}
        </div>
      )}
    </div>
  );
}