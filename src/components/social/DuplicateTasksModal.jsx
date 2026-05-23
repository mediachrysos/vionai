import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronUp, Copy } from "lucide-react";

const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const typeColors = {
  Reels: "bg-purple-100 text-purple-700",
  Post: "bg-blue-100 text-blue-700",
  Story: "bg-pink-100 text-pink-700",
};

export default function DuplicateTasksModal({ dayTasks, onDuplicate, onClose }) {
  const [selected, setSelected] = useState({}); // { "mon_0": true, "mon_1": false, ...}
  const [expandedDays, setExpandedDays] = useState(new Set());

  // Initialize selected with all tasks checked (no links)
  React.useEffect(() => {
    const init = {};
    DAYS.forEach(({ key }) => {
      (dayTasks[key] || []).forEach((task, idx) => {
        // Only check if there's no inspiration link
        init[`${key}_${idx}`] = !task.inspiration_link;
      });
    });
    setSelected(init);
  }, [dayTasks]);

  const toggleTask = (dayKey, idx) => {
    setSelected(prev => ({
      ...prev,
      [`${dayKey}_${idx}`]: !prev[`${dayKey}_${idx}`]
    }));
  };

  const toggleDayAll = (dayKey) => {
    const dayTasks_ = dayTasks[dayKey] || [];
    const allChecked = dayTasks_.every((_, idx) => selected[`${dayKey}_${idx}`]);
    setSelected(prev => {
      const next = { ...prev };
      dayTasks_.forEach((_, idx) => {
        next[`${dayKey}_${idx}`] = !allChecked;
      });
      return next;
    });
  };

  const toggleExpandDay = (dayKey) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(dayKey)) next.delete(dayKey);
      else next.add(dayKey);
      return next;
    });
  };

  const getSelectedForDay = (dayKey) => {
    const dayTasks_ = dayTasks[dayKey] || [];
    return dayTasks_.filter((_, idx) => selected[`${dayKey}_${idx}`]).map(t => ({
      type: t.type || "Reels",
      customType: t.customType || "",
      desc: t.desc || "",
      inspiration_link: "",
      model_id: t.model_id || "",
      priority: t.priority || "normal",
      // Explicitly ensure no submission data
      submitted_link: "",
      status: "not_started",
      admin_note: "",
      submitted_at: "",
      reviewed_at: ""
    }));
  };

  const handleDuplicate = () => {
    const selectedData = {};
    DAYS.forEach(({ key }) => {
      selectedData[key] = getSelectedForDay(key);
    });
    onDuplicate(selectedData);
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Select Tasks to Duplicate</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="text-lg">✕</span>
          </button>
        </div>

        <div className="p-4 space-y-3">
          {DAYS.map(({ key, label }) => {
            const tasks = dayTasks[key] || [];
            const isExpanded = expandedDays.has(key);
            const count = tasks.filter((_, idx) => selected[`${key}_${idx}`]).length;

            return (
              <div key={key} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleExpandDay(key)}
                  className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 px-4 py-3 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={tasks.length > 0 && tasks.every((_, idx) => selected[`${key}_${idx}`])}
                      onChange={() => toggleDayAll(key)}
                      onClick={e => e.stopPropagation()}
                      className="w-4 h-4 cursor-pointer"
                    />
                    <div className="text-left">
                      <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{label}</p>
                      <p className="text-[10px] text-gray-400">{count} of {tasks.length} selected</p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {isExpanded && tasks.length > 0 && (
                  <div className="border-t border-gray-200 divide-y divide-gray-100">
                    {tasks.map((task, idx) => (
                      <div key={idx} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!selected[`${key}_${idx}`]}
                            onChange={() => toggleTask(key, idx)}
                            className="w-4 h-4 mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeColors[task.type] || "bg-gray-100 text-gray-700"}`}>
                                {task.type}
                              </span>
                              {task.priority && task.priority !== "normal" && (
                                <span className="text-[10px] text-gray-500">
                                  {task.priority === "urgent" ? "🔴" : task.priority === "high" ? "🟠" : "⚪"} {task.priority}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-700 mt-1 line-clamp-2">{task.desc || "(No description)"}</p>
                            {task.inspiration_link && (
                              <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                                🔗 Link will be removed
                              </p>
                            )}
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {tasks.length === 0 && (
                  <div className="px-4 py-3 text-xs text-gray-400 italic">No tasks</div>
                )}
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {Object.values(selected).filter(Boolean).length} tasks will be duplicated
          </p>
          <div className="flex items-center gap-2">
            <Button onClick={onClose} variant="outline" size="sm">Cancel</Button>
            <Button onClick={handleDuplicate} size="sm" className="gap-1.5 bg-violet-500 hover:bg-violet-600 text-white">
              <Copy className="w-3.5 h-3.5" /> Duplicate Selected
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}