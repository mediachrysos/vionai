import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Plus, Trash2, Check, Clock, Loader, Target, AlertTriangle, Lightbulb, Flag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  todo: { label: "Nesplněno", icon: Clock, color: "bg-gray-100 text-gray-500" },
  in_progress: { label: "Probíhá", icon: Loader, color: "bg-blue-100 text-blue-600" },
  done: { label: "Hotovo", icon: Check, color: "bg-emerald-100 text-emerald-600" },
};

const OWNERS = ["Lukáš", "Maty", "Team", "Ostatní"];

function TaskRow({ task, onUpdate, onDelete }) {
  const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
  const Icon = cfg.icon;
  const cycleStatus = () => {
    const order = ["todo", "in_progress", "done"];
    const next = order[(order.indexOf(task.status) + 1) % order.length];
    onUpdate({ ...task, status: next });
  };

  return (
    <div className="flex items-center gap-2 py-1.5 group">
      <button onClick={cycleStatus} className={cn("w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all border", cfg.color, "border-transparent hover:scale-110")}>
        <Icon className="w-3 h-3" />
      </button>
      <span className={cn("flex-1 text-sm", task.status === "done" && "line-through text-gray-400")}>{task.title}</span>
      <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-amber-50 border-amber-200 text-amber-700">{task.owner || "?"}</Badge>
      {task.deadline && <span className="text-[10px] text-gray-400">{task.deadline}</span>}
      <button onClick={() => onDelete(task.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function AddTaskRow({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("Lukáš");

  const submit = () => {
    if (!title.trim()) return;
    onAdd({ id: Date.now().toString(), title: title.trim(), owner, status: "todo" });
    setTitle("");
    setOpen(false);
  };

  if (!open) return (
    <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#c29c24] mt-1 transition-colors">
      <Plus className="w-3.5 h-3.5" /> Přidat úkol
    </button>
  );

  return (
    <div className="flex items-center gap-2 mt-1">
      <input autoFocus value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="Název úkolu..." className="flex-1 text-sm border border-gray-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#c29c24]" />
      <select value={owner} onChange={e => setOwner(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-1.5 py-1 focus:outline-none focus:border-[#c29c24]">
        {OWNERS.map(o => <option key={o}>{o}</option>)}
      </select>
      <button onClick={submit} className="text-xs px-2.5 py-1 bg-[#c29c24] text-white rounded-lg hover:bg-[#a8841c]">OK</button>
      <button onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">Zrušit</button>
    </div>
  );
}

function EditableList({ items = [], onUpdate, placeholder, addLabel }) {
  const [adding, setAdding] = useState(false);
  const [newVal, setNewVal] = useState("");

  const add = () => {
    if (!newVal.trim()) return;
    onUpdate([...items, newVal.trim()]);
    setNewVal("");
    setAdding(false);
  };

  return (
    <div className="space-y-1">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 group">
          <span className="w-1.5 h-1.5 rounded-full bg-[#c29c24] flex-shrink-0 mt-1.5" />
          <span className="flex-1 text-sm text-gray-700">{item}</span>
          <button onClick={() => onUpdate(items.filter((_, j) => j !== i))} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 flex-shrink-0">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}
      {adding ? (
        <div className="flex gap-2">
          <input autoFocus value={newVal} onChange={e => setNewVal(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder={placeholder} className="flex-1 text-sm border border-gray-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#c29c24]" />
          <button onClick={add} className="text-xs px-2 py-1 bg-[#c29c24] text-white rounded-lg">OK</button>
          <button onClick={() => setAdding(false)} className="text-xs text-gray-400">✕</button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#c29c24] transition-colors">
          <Plus className="w-3 h-3" /> {addLabel}
        </button>
      )}
    </div>
  );
}

export default function MonthCard({ month, filterOwner, filterIncomplete, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(month.order <= 1);

  const tasks = month.tasks || [];
  const visibleTasks = tasks.filter(t => {
    if (filterOwner && filterOwner !== "all" && t.owner !== filterOwner) return false;
    if (filterIncomplete && t.status === "done") return false;
    return true;
  });

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === "done").length;
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const statusColor = pct >= 75 ? "text-emerald-600" : pct >= 30 ? "text-amber-500" : "text-red-500";
  const statusDot = pct >= 75 ? "bg-emerald-400" : pct >= 30 ? "bg-amber-400" : "bg-red-400";
  const statusLabel = pct >= 75 ? "Na cestě" : pct >= 30 ? "Probíhá" : "Pozadu";

  const updateTasks = (newTasks) => onUpdate({ ...month, tasks: newTasks });
  const addTask = (task) => updateTasks([...tasks, task]);
  const updateTask = (updated) => updateTasks(tasks.map(t => t.id === updated.id ? updated : t));
  const deleteTask = (id) => updateTasks(tasks.filter(t => t.id !== id));

  return (
    <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_4px_16px_rgba(0,0,0,0.04)] overflow-hidden flex-shrink-0 w-[340px]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-50 cursor-pointer select-none" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", statusDot)} />
            <h3 className="text-base font-bold text-gray-900">{month.label}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-semibold", statusColor)}>{statusLabel}</span>
            <span className="text-xs text-gray-400 bg-gray-50 rounded-full px-2 py-0.5">{pct}%</span>
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-[#c29c24] to-[#e8c84a] transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-1">{doneTasks}/{totalTasks} úkolů splněno</p>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 py-4 space-y-5">
              {/* Priorities */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Flag className="w-3.5 h-3.5 text-[#c29c24]" />
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Priority</span>
                </div>
                <EditableList items={month.priorities} onUpdate={v => onUpdate({ ...month, priorities: v })} placeholder="Nová priorita..." addLabel="Přidat prioritu" />
              </div>

              {/* Tasks */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Check className="w-3.5 h-3.5 text-[#c29c24]" />
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Úkoly</span>
                </div>
                <div className="space-y-0.5">
                  {visibleTasks.map(task => (
                    <TaskRow key={task.id} task={task} onUpdate={updateTask} onDelete={deleteTask} />
                  ))}
                  {visibleTasks.length === 0 && tasks.length > 0 && (
                    <p className="text-xs text-gray-400 italic">Žádné úkoly odpovídající filtru</p>
                  )}
                </div>
                <AddTaskRow onAdd={addTask} />
              </div>

              {/* Targets */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Target className="w-3.5 h-3.5 text-[#c29c24]" />
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Cíle</span>
                </div>
                <EditableList items={month.targets} onUpdate={v => onUpdate({ ...month, targets: v })} placeholder="Nový cíl..." addLabel="Přidat cíl" />
              </div>

              {/* Blockers */}
              {((month.blockers && month.blockers.length > 0)) && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Blokery</span>
                  </div>
                  <EditableList items={month.blockers} onUpdate={v => onUpdate({ ...month, blockers: v })} placeholder="Nový bloker..." addLabel="Přidat bloker" />
                </div>
              )}
              {(!month.blockers || month.blockers.length === 0) && (
                <button onClick={() => onUpdate({ ...month, blockers: [""] })} className="flex items-center gap-1 text-xs text-gray-300 hover:text-red-400 transition-colors">
                  <AlertTriangle className="w-3 h-3" /> Přidat bloker
                </button>
              )}

              {/* Decisions */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Lightbulb className="w-3.5 h-3.5 text-[#c29c24]" />
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Klíčová rozhodnutí</span>
                </div>
                <EditableList items={month.decisions} onUpdate={v => onUpdate({ ...month, decisions: v })} placeholder="Nové rozhodnutí..." addLabel="Přidat rozhodnutí" />
              </div>
            </div>

            {/* Delete month */}
            <div className="px-5 pb-4 flex justify-end">
              <button onClick={() => onDelete(month.id)} className="text-xs text-gray-300 hover:text-red-400 transition-colors flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Smazat měsíc
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}