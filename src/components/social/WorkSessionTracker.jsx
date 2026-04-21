import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Square, Clock, Edit2, Check, X, History } from "lucide-react";
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
  return Math.floor(minutes / 15) * 15;
}

function fmtTime(iso) {
  if (!iso) return "?";
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function WorkSessionTracker({ designerEmail, dashboardId, isAdmin }) {
  const qc = useQueryClient();
  const today = getToday();
  const [elapsed, setElapsed] = useState(0);
  const [editingSession, setEditingSession] = useState(null);
  const [editMinutes, setEditMinutes] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const queryKey = ["workSessions", designerEmail, dashboardId, today];

  const { data: sessions = [] } = useQuery({
    queryKey,
    queryFn: () => base44.entities.DesignerWorkSession.filter({
      designer_email: designerEmail,
      dashboard_id: dashboardId,
      date: today,
    }),
    refetchInterval: 30000,
    enabled: !!designerEmail && !!dashboardId,
  });

  const activeSession = sessions.find(s => s.is_active);
  const pastSessions = sessions.filter(s => !s.is_active);
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.minutes_worked || 0), 0);
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
    qc.invalidateQueries({ queryKey });
  };

  const handleStop = async () => {
    if (!activeSession) return;
    const rawMins = Math.floor((Date.now() - new Date(activeSession.started_at).getTime()) / 60000);
    await base44.entities.DesignerWorkSession.update(activeSession.id, {
      ended_at: new Date().toISOString(),
      is_active: false,
      minutes_worked: roundDownTo15(rawMins),
    });
    qc.invalidateQueries({ queryKey });
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
    qc.invalidateQueries({ queryKey });
  };

  const handleDelete = async (id) => {
    await base44.entities.DesignerWorkSession.delete(id);
    qc.invalidateQueries({ queryKey });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
            <Clock className="w-3.5 h-3.5 text-gray-500" />
          </div>
          <span className="text-sm font-semibold text-gray-800">Today's work</span>
        </div>
        <span className="text-xl font-bold text-gray-900 tabular-nums">{minutesToDisplay(roundedTotal)}</span>
      </div>

      {/* Active session pill */}
      {activeSession && (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-800">
              {fmtTime(activeSession.started_at)} – now
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-emerald-700 tabular-nums">
              {minutesToDisplay(roundDownTo15(liveMinutes))}
            </span>
            {isAdmin && (
              <button onClick={() => handleDelete(activeSession.id)} className="text-emerald-300 hover:text-red-400 transition-colors">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

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

      {/* History */}
      {pastSessions.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(v => !v)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            {showHistory ? "Hide" : "Show"} history ({pastSessions.length} sessions)
          </button>

          {showHistory && (
            <div className="mt-2 space-y-1">
              {pastSessions.map(s => (
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
          )}
        </div>
      )}
    </div>
  );
}