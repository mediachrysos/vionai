import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Square, Clock, Edit2, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const roundedTotal = roundDownTo15(totalMinutes + (activeSession ? Math.floor(elapsed / 60) : 0));

  // Live timer
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
    const startTime = new Date(activeSession.started_at).getTime();
    const rawMins = Math.floor((Date.now() - startTime) / 60000);
    const rounded = roundDownTo15(rawMins);
    await base44.entities.DesignerWorkSession.update(activeSession.id, {
      ended_at: new Date().toISOString(),
      is_active: false,
      minutes_worked: rounded,
    });
    qc.invalidateQueries({ queryKey });
  };

  const handleEditSave = async (session) => {
    const mins = parseInt(editMinutes, 10);
    if (isNaN(mins) || mins < 0) return;
    const rounded = roundDownTo15(mins);
    await base44.entities.DesignerWorkSession.update(session.id, {
      minutes_worked: rounded,
      is_active: false,
      ended_at: session.ended_at || new Date().toISOString(),
    });
    setEditingSession(null);
    qc.invalidateQueries({ queryKey });
  };

  const handleDeleteSession = async (id) => {
    await base44.entities.DesignerWorkSession.delete(id);
    qc.invalidateQueries({ queryKey });
  };

  const liveElapsedDisplay = minutesToDisplay(roundDownTo15(Math.floor(elapsed / 60)));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">Today's work</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-800">{minutesToDisplay(roundedTotal)}</span>
          {activeSession && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium animate-pulse">
              ● Working
            </span>
          )}
        </div>
      </div>

      {/* Start / Stop button — designer only */}
      {!isAdmin && (
        <div>
          {!activeSession ? (
            <Button onClick={handleStart} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-9">
              <Play className="w-4 h-4" /> Start working
            </Button>
          ) : (
            <Button onClick={handleStop} className="w-full bg-red-500 hover:bg-red-600 text-white gap-2 h-9">
              <Square className="w-4 h-4" /> Stop ({liveElapsedDisplay})
            </Button>
          )}
        </div>
      )}

      {/* Active session row — always visible */}
      {activeSession && (
        <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
          <span className="flex-1 font-medium">
            {fmtTime(activeSession.started_at)} – now
          </span>
          <span className="font-semibold">{minutesToDisplay(roundDownTo15(Math.floor(elapsed / 60)))}</span>
          <span className="text-emerald-500 font-bold">●</span>
          {isAdmin && (
            <button onClick={() => handleDeleteSession(activeSession.id)} className="text-emerald-300 hover:text-red-400 ml-1">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* History toggle */}
      {pastSessions.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory(v => !v)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showHistory ? "Hide" : "Show"} history ({pastSessions.length})
          </button>

          {showHistory && (
            <div className="space-y-1.5 mt-2">
              {pastSessions.map(s => (
                <div key={s.id} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                  {editingSession === s.id ? (
                    <>
                      <Input
                        value={editMinutes}
                        onChange={e => setEditMinutes(e.target.value)}
                        className="h-7 text-xs w-20"
                        placeholder="min"
                        type="number"
                        min="0"
                      />
                      <span className="text-gray-400">min</span>
                      <button onClick={() => handleEditSave(s)} className="text-emerald-600 hover:text-emerald-800">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEditingSession(null)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1">
                        {fmtTime(s.started_at)} – {fmtTime(s.ended_at)}
                      </span>
                      <span className="font-semibold text-gray-800">{minutesToDisplay(s.minutes_worked || 0)}</span>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => { setEditingSession(s.id); setEditMinutes(String(s.minutes_worked || 0)); }}
                            className="text-gray-300 hover:text-amber-500 ml-1"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button onClick={() => handleDeleteSession(s.id)} className="text-gray-200 hover:text-red-400">
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