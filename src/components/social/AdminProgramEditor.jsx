import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { Save, Plus, Trash2, Link, Copy, CheckCircle, XCircle } from "lucide-react";
import DuplicateTasksModal from "./DuplicateTasksModal";

const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const PRESET_TYPES = ["Reels", "Post", "Story"];

const typeColors = {
  Reels: "bg-purple-100 text-purple-700",
  Post: "bg-blue-100 text-blue-700",
  Story: "bg-pink-100 text-pink-700",
};

const PRIORITIES = [
  { value: "urgent", label: "🔴 Urgent" },
  { value: "high", label: "🟠 High" },
  { value: "normal", label: "🟢 Normal" },
  { value: "low", label: "⚪ Low" },
];

function emptyTask() {
  return { type: "Reels", customType: "", desc: "", inspiration_link: "", model_id: "", priority: "normal" };
}

export default function AdminProgramEditor({ weekStart, program, models = [], designerEmail, designerName, onSaved, isDraft }) {
  const [dayTasks, setDayTasks] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [duplicated, setDuplicated] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // Use refs for values that doSave needs without causing re-renders / stale closures
  const programIdRef = useRef(program?.id ?? null);
  const dayTasksRef = useRef({});
  const autosaveTimer = useRef(null);
  const isInitialized = useRef(false);
  const isSavingRef = useRef(false);

  // Sync programIdRef when program changes
  useEffect(() => {
    if (program?.id) programIdRef.current = program.id;
  }, [program?.id]);

  // Re-initialize only when week or program identity changes, and not while user is editing
  useEffect(() => {
    if (isInitialized.current && hasUnsaved) return; // Don't overwrite unsaved changes

    const f = {};
    DAYS.forEach(({ key }) => {
      const tasks = program?.[`${key}_tasks`];
      f[key] = (Array.isArray(tasks) && tasks.length > 0) ? tasks.map(t => ({
        type: t.type || "Reels",
        customType: t.customType || "",
        desc: t.desc || "",
        inspiration_link: t.inspiration_link || "",
        model_id: t.model_id || "",
        priority: t.priority || "normal",
      })) : [];
    });
    dayTasksRef.current = f;
    setDayTasks(f);
    isInitialized.current = true;
  }, [program?.id, weekStart]); // Only re-init when program ID or week changes

  const doSave = useCallback(async (tasks) => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setSaving(true);
    const data = { week_start: weekStart, designer_email: designerEmail };
    DAYS.forEach(({ key }) => { data[`${key}_tasks`] = tasks[key] || []; });
    try {
      let savedProgram;
      if (programIdRef.current) {
        savedProgram = await base44.entities.WeeklyProgram.update(programIdRef.current, data);
      } else {
        savedProgram = await base44.entities.WeeklyProgram.create(data);
        if (savedProgram?.id) programIdRef.current = savedProgram.id;
      }
      setHasUnsaved(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      // Re-initialize from saved data so UI reflects actual DB state
      if (savedProgram) {
        const f = {};
        DAYS.forEach(({ key }) => {
          const savedTasks = savedProgram[`${key}_tasks`];
          f[key] = (Array.isArray(savedTasks) && savedTasks.length > 0) ? savedTasks.map(t => ({
            type: t.type || "Reels",
            customType: t.customType || "",
            desc: t.desc || "",
            inspiration_link: t.inspiration_link || "",
            model_id: t.model_id || "",
            priority: t.priority || "normal",
          })) : [];
        });
        dayTasksRef.current = f;
        setDayTasks(f);
      }
      onSaved();
    } finally {
      setSaving(false);
      isSavingRef.current = false;
    }
  }, [weekStart, designerEmail, onSaved]);

  const triggerAutosave = useCallback(() => {
    if (!isInitialized.current) return;
    setHasUnsaved(true);
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      doSave(dayTasksRef.current);
    }, 1500);
  }, [doSave]);

  const addTask = (dayKey) => {
    setDayTasks(prev => {
      const next = { ...prev, [dayKey]: [...(prev[dayKey] || []), emptyTask()] };
      dayTasksRef.current = next;
      return next;
    });
    triggerAutosave();
  };

  const removeTask = (dayKey, idx) => {
    setDayTasks(prev => {
      const next = { ...prev, [dayKey]: prev[dayKey].filter((_, i) => i !== idx) };
      dayTasksRef.current = next;
      return next;
    });
    triggerAutosave();
  };

  const updateTask = (dayKey, idx, field, value) => {
    setDayTasks(prev => {
      const tasks = [...(prev[dayKey] || [])];
      tasks[idx] = { ...tasks[idx], [field]: value };
      const next = { ...prev, [dayKey]: tasks };
      dayTasksRef.current = next;
      return next;
    });
    triggerAutosave();
  };

  const handleSave = () => doSave(dayTasksRef.current);

  const handleConfirmDraft = async () => {
    if (!programIdRef.current) return;
    await base44.entities.WeeklyProgram.update(programIdRef.current, { is_draft: false });
    onSaved();
  };

  const handleRejectDraft = async () => {
    if (!programIdRef.current) return;
    await base44.entities.WeeklyProgram.delete(programIdRef.current);
    programIdRef.current = null;
    // Clear all tasks
    const empty = {};
    DAYS.forEach(({ key }) => { empty[key] = []; });
    dayTasksRef.current = empty;
    setDayTasks(empty);
    onSaved();
  };

  const handleDuplicateToNextWeek = () => {
    setShowDuplicateModal(true);
  };

  const handleConfirmDuplicate = async (selectedTasks) => {
    setDuplicating(true);
    const nextWeekStart = (() => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + 7);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    })();
    // Check if next week already has a program
    const existing = await base44.entities.WeeklyProgram.filter({ week_start: nextWeekStart, designer_email: designerEmail });
    const data = { week_start: nextWeekStart, designer_email: designerEmail, is_draft: false };
    DAYS.forEach(({ key }) => {
      // Reset submission data — keep task structure but clear submission links
      data[`${key}_tasks`] = (selectedTasks[key] || []).map(t => ({
        ...t,
        submitted_link: "",
        status: "not_started",
        admin_note: "",
        submitted_at: "",
        reviewed_at: ""
      }));
    });
    if (existing.length > 0) {
      await base44.entities.WeeklyProgram.update(existing[0].id, data);
    } else {
      await base44.entities.WeeklyProgram.create(data);
    }
    setShowDuplicateModal(false);
    setDuplicating(false);
    setDuplicated(true);
    setTimeout(() => setDuplicated(false), 3000);
  };

  return (
    <>
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      {isDraft && (
        <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <Copy className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Návrh z minulého týdne</p>
              <p className="text-xs text-amber-600">Tasky byly automaticky zkopírovány. Potvrď, uprav nebo zamítni.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button onClick={handleRejectDraft} size="sm" variant="outline" className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50">
              <XCircle className="w-3.5 h-3.5" /> Zamítnout
            </Button>
            <Button onClick={handleConfirmDraft} size="sm" className="gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white">
              <CheckCircle className="w-3.5 h-3.5" /> Potvrdit
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Edit Weekly Program</h3>
          {designerName && <p className="text-xs text-gray-400 mt-0.5">Grafik: {designerName}</p>}
        </div>
        <div className="flex items-center gap-2">
          {hasUnsaved && !saving && (
            <span className="text-xs text-amber-500 font-medium">Unsaved changes...</span>
          )}
          <Button onClick={handleDuplicateToNextWeek} disabled={duplicating || duplicated} size="sm"
            className={`gap-1.5 transition-colors ${duplicated ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-violet-100 hover:bg-violet-200 text-violet-700"}`}>
            <Copy className="w-3.5 h-3.5" /> {duplicating ? "Copying..." : duplicated ? "Copied ✓" : "Duplicate to next week"}
          </Button>
          <Button onClick={handleSave} disabled={saving} size="sm" className={`text-white gap-1.5 transition-colors ${saved ? "bg-emerald-500 hover:bg-emerald-600" : "bg-[#C9A227] hover:bg-[#A8841C]"}`}>
            <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : saved ? "Saved ✓" : "Save"}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {DAYS.map(({ key, label }) => {
          const tasks = dayTasks[key] || [];
          return (
            <div key={key} className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</p>
                <button
                  onClick={() => addTask(key)}
                  className="flex items-center gap-1 text-xs text-[#C9A227] hover:text-[#A8841C] font-medium"
                >
                  <Plus className="w-3.5 h-3.5" /> Add task
                </button>
              </div>

              {tasks.length === 0 && (
                <p className="text-xs text-gray-400 italic">No tasks — click "Add task" to add one.</p>
              )}

              {tasks.map((task, idx) => {
                const isCustom = !PRESET_TYPES.includes(task.type);
                return (
                  <div key={idx} className="bg-white rounded-xl border border-gray-200 p-3 space-y-2.5">
                    <div className="flex items-center gap-2">
                      {/* Type selector */}
                      <div className="flex gap-1 flex-wrap flex-1">
                        {PRESET_TYPES.map(t => (
                          <button
                            key={t}
                            onClick={() => updateTask(key, idx, "type", t)}
                            className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-all ${
                              task.type === t
                                ? (typeColors[t] || "bg-gray-200 text-gray-700") + " border-transparent"
                                : "border-gray-200 text-gray-400 hover:border-gray-300"
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                        <button
                          onClick={() => updateTask(key, idx, "type", "custom")}
                          className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-all ${
                            isCustom
                              ? "bg-amber-100 text-amber-700 border-transparent"
                              : "border-gray-200 text-gray-400 hover:border-gray-300"
                          }`}
                        >
                          Custom
                        </button>
                      </div>
                      <button onClick={() => removeTask(key, idx)} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {isCustom && (
                      <Input
                        placeholder="Custom type name..."
                        value={task.customType}
                        onChange={e => updateTask(key, idx, "customType", e.target.value)}
                        className="text-xs h-8"
                      />
                    )}

                    <Input
                      placeholder="Task description..."
                      value={task.desc}
                      onChange={e => updateTask(key, idx, "desc", e.target.value)}
                      className="text-xs h-8"
                    />

                    {/* Model selector */}
                    <select
                      value={task.model_id || ""}
                      onChange={e => updateTask(key, idx, "model_id", e.target.value)}
                      className="w-full text-xs h-8 border border-gray-200 rounded-md px-2 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-300"
                    >
                      <option value="">All models / no specific model</option>
                      {models.filter(m => m.status === "active").map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>

                    {/* Priority selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide flex-shrink-0">Priority:</span>
                      <div className="flex gap-1 flex-wrap">
                        {PRIORITIES.map(p => (
                          <button
                            key={p.value}
                            onClick={() => updateTask(key, idx, "priority", p.value)}
                            className={`text-xs px-2 py-0.5 rounded-full border transition-all ${
                              (task.priority || "normal") === p.value
                                ? "bg-gray-800 text-white border-gray-800"
                                : "border-gray-200 text-gray-400 hover:border-gray-400"
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                      <Input
                        placeholder="Inspiration link (optional)..."
                        value={task.inspiration_link}
                        onChange={e => updateTask(key, idx, "inspiration_link", e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>

    {showDuplicateModal && (
      <DuplicateTasksModal
        dayTasks={dayTasks}
        onDuplicate={handleConfirmDuplicate}
        onClose={() => setShowDuplicateModal(false)}
      />
    )}
    </>
  );
}