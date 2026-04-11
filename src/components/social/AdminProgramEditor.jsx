import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { Save, Plus, Trash2, Link } from "lucide-react";

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

function emptyTask() {
  return { type: "Reels", customType: "", desc: "", inspiration_link: "" };
}

export default function AdminProgramEditor({ weekStart, program, onSaved }) {
  const [dayTasks, setDayTasks] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const f = {};
    DAYS.forEach(({ key }) => {
      const tasks = program?.[`${key}_tasks`];
      f[key] = (Array.isArray(tasks) && tasks.length > 0) ? tasks.map(t => ({
        type: t.type || "Reels",
        customType: t.customType || "",
        desc: t.desc || "",
        inspiration_link: t.inspiration_link || "",
      })) : [];
    });
    setDayTasks(f);
  }, [program, weekStart]);

  const addTask = (dayKey) => {
    setDayTasks(prev => ({ ...prev, [dayKey]: [...(prev[dayKey] || []), emptyTask()] }));
  };

  const removeTask = (dayKey, idx) => {
    setDayTasks(prev => ({ ...prev, [dayKey]: prev[dayKey].filter((_, i) => i !== idx) }));
  };

  const updateTask = (dayKey, idx, field, value) => {
    setDayTasks(prev => {
      const tasks = [...(prev[dayKey] || [])];
      tasks[idx] = { ...tasks[idx], [field]: value };
      return { ...prev, [dayKey]: tasks };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const data = { week_start: weekStart };
    DAYS.forEach(({ key }) => { data[`${key}_tasks`] = dayTasks[key] || []; });
    if (program?.id) {
      await base44.entities.WeeklyProgram.update(program.id, data);
    } else {
      await base44.entities.WeeklyProgram.create(data);
    }
    setSaving(false);
    onSaved();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Edit Weekly Program</h3>
        <Button onClick={handleSave} disabled={saving} size="sm" className="bg-[#C9A227] hover:bg-[#A8841C] text-white gap-1.5">
          <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save"}
        </Button>
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
  );
}