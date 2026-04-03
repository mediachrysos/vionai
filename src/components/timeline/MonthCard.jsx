import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Plus, Trash2, Check, ArrowRight, Target, AlertTriangle, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";

const STATUS_CONFIG = {
  todo:        { label: "Nesplněno", color: "border-gray-300 bg-white text-gray-400" },
  in_progress: { label: "Probíhá",   color: "border-[#c29c24] bg-amber-50 text-[#c29c24]" },
  done:        { label: "Hotovo",    color: "border-[#c29c24] bg-[#c29c24] text-white" },
};

const OWNERS = ["Lukáš", "Maty", "Team", "Ostatní"];

const OWNER_COLORS = {
  "Lukáš":   "bg-violet-100 text-violet-700",
  "Maty":    "bg-sky-100 text-sky-700",
  "Team":    "bg-amber-100 text-amber-700",
  "Ostatní": "bg-gray-100 text-gray-500",
};

function fireConfetti() {
  confetti({
    particleCount: 90,
    spread: 70,
    origin: { y: 0.55 },
    colors: ["#C9A227", "#e8c84a", "#fff", "#f0d060", "#a8841c"],
  });
}

function TaskRow({ task, onUpdate, onDelete }) {
  const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
  const ownerColor = OWNER_COLORS[task.owner] || "bg-gray-100 text-gray-500";

  const cycleStatus = () => {
    const order = ["todo", "in_progress", "done"];
    const next = order[(order.indexOf(task.status) + 1) % order.length];
    if (next === "done") fireConfetti();
    onUpdate({ ...task, status: next });
  };

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-amber-50/40 group transition-colors">
      <button
        onClick={cycleStatus}
        title={cfg.label}
        className={cn(
          "w-5 h-5 rounded-full flex-shrink-0 border-2 flex items-center justify-center transition-all hover:scale-110",
          cfg.color
        )}
      >
        {task.status === "done" && <Check className="w-2.5 h-2.5" />}
        {task.status === "in_progress" && <ArrowRight className="w-2.5 h-2.5" />}
      </button>
      <span className={cn("flex-1 text-sm leading-snug", task.status === "done" && "line-through text-gray-400")}>
        {task.title}
      </span>
      <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0", ownerColor)}>
        {task.owner || "?"}
      </span>
      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 flex-shrink-0"
      >
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
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#c29c24] mt-2 ml-1 transition-colors"
    >
      <Plus className="w-3.5 h-3.5" /> Přidat úkol
    </button>
  );

  return (
    <div className="flex items-center gap-2 mt-2 bg-amber-50/60 rounded-xl p-2 border border-amber-100">
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => e.key === "Enter" && submit()}
        placeholder="Název úkolu..."
        className="flex-1 text-sm bg-white border border-amber-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#c29c24]"
      />
      <select
        value={owner}
        onChange={e => setOwner(e.target.value)}
        className="text-xs bg-white border border-amber-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#c29c24]"
      >
        {OWNERS.map(o => <option key={o}>{o}</option>)}
      </select>
      <button onClick={submit} className="text-xs px-3 py-1.5 bg-gradient-to-r from-[#C9A227] to-[#A8841C] text-white rounded-lg hover:opacity-90 font-medium">Přidat</button>
      <button onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600 px-1">✕</button>
    </div>
  );
}

/* ─── Goal item — checkable with confetti ─── */
function GoalItem({ item, onDone, onDelete, done }) {
  return (
    <div className="flex items-start gap-3 py-2 px-3 rounded-xl hover:bg-amber-50/40 group transition-colors">
      <button
        onClick={onDone}
        className={cn(
          "w-5 h-5 rounded-full flex-shrink-0 border-2 flex items-center justify-center mt-0.5 transition-all hover:scale-110",
          done
            ? "border-[#c29c24] bg-[#c29c24] text-white"
            : "border-gray-300 bg-white hover:border-[#c29c24]"
        )}
      >
        {done && <Check className="w-2.5 h-2.5" />}
      </button>
      <span className={cn("flex-1 text-sm leading-snug text-gray-700", done && "line-through text-gray-400")}>
        {item}
      </span>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 flex-shrink-0"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

function GoalsList({ items = [], doneItems = [], onUpdate, onUpdateDone }) {
  const [adding, setAdding] = useState(false);
  const [newVal, setNewVal] = useState("");

  const add = () => {
    if (!newVal.trim()) return;
    onUpdate([...items, newVal.trim()]);
    setNewVal("");
    setAdding(false);
  };

  const toggleDone = (item) => {
    const isDone = doneItems.includes(item);
    if (!isDone) fireConfetti();
    onUpdateDone(isDone ? doneItems.filter(d => d !== item) : [...doneItems, item]);
  };

  const deleteItem = (i) => {
    const item = items[i];
    onUpdate(items.filter((_, j) => j !== i));
    onUpdateDone(doneItems.filter(d => d !== item));
  };

  return (
    <div className="-mx-1">
      {items.length === 0 && !adding && (
        <p className="text-xs text-gray-400 italic px-3 py-1">Zatím žádné cíle</p>
      )}
      {items.map((item, i) => (
        <GoalItem
          key={i}
          item={item}
          done={doneItems.includes(item)}
          onDone={() => toggleDone(item)}
          onDelete={() => deleteItem(i)}
        />
      ))}
      {adding ? (
        <div className="flex gap-2 mt-2 px-1">
          <input
            autoFocus
            value={newVal}
            onChange={e => setNewVal(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()}
            placeholder="Nový cíl..."
            className="flex-1 text-sm border border-amber-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#c29c24]"
          />
          <button onClick={add} className="text-xs px-2.5 py-1.5 bg-gradient-to-r from-[#C9A227] to-[#A8841C] text-white rounded-lg font-medium">OK</button>
          <button onClick={() => { setAdding(false); setNewVal(""); }} className="text-xs text-gray-400">✕</button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#c29c24] transition-colors mt-1 ml-2"
        >
          <Plus className="w-3 h-3" /> Přidat cíl
        </button>
      )}
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
    <div className="space-y-0.5 -mx-1">
      {items.length === 0 && !adding && (
        <p className="text-xs text-gray-400 italic px-3 py-1">Zatím nic</p>
      )}
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2.5 py-2 px-3 rounded-xl hover:bg-amber-50/40 group transition-colors">
          <span className="w-1.5 h-1.5 rounded-full bg-[#c29c24] flex-shrink-0 mt-1.5" />
          <span className="flex-1 text-sm text-gray-700 leading-snug">{item}</span>
          <button
            onClick={() => onUpdate(items.filter((_, j) => j !== i))}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400 flex-shrink-0"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}
      {adding ? (
        <div className="flex gap-2 mt-2 px-1">
          <input
            autoFocus
            value={newVal}
            onChange={e => setNewVal(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()}
            placeholder={placeholder}
            className="flex-1 text-sm border border-amber-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#c29c24]"
          />
          <button onClick={add} className="text-xs px-2.5 py-1.5 bg-gradient-to-r from-[#C9A227] to-[#A8841C] text-white rounded-lg font-medium">OK</button>
          <button onClick={() => { setAdding(false); setNewVal(""); }} className="text-xs text-gray-400">✕</button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#c29c24] transition-colors mt-1 ml-2"
        >
          <Plus className="w-3 h-3" /> {addLabel}
        </button>
      )}
    </div>
  );
}

function Section({ icon: SectionIcon, title, accent, children }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-amber-100/80 bg-white shadow-sm">
      <div className={cn("flex items-center gap-2.5 px-4 py-2.5", accent)}>
        <SectionIcon className="w-3.5 h-3.5" />
        <span className="text-xs font-bold uppercase tracking-widest">{title}</span>
      </div>
      <div className="px-1 py-2">
        {children}
      </div>
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
  const inProgressTasks = tasks.filter(t => t.status === "in_progress").length;
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const statusLabel = pct >= 75 ? "Na cestě 🚀" : pct >= 30 ? "Probíhá" : "Pozadu";
  const statusBadge = pct >= 75
    ? "bg-gradient-to-r from-[#C9A227] to-[#e8c84a] text-white"
    : pct >= 30
    ? "bg-amber-100 text-amber-700"
    : "bg-red-100 text-red-600";

  const updateTasks = (newTasks) => onUpdate({ ...month, tasks: newTasks });
  const addTask = (task) => updateTasks([...tasks, task]);
  const updateTask = (updated) => updateTasks(tasks.map(t => t.id === updated.id ? updated : t));
  const deleteTask = (id) => updateTasks(tasks.filter(t => t.id !== id));

  const doneTargets = month.doneTargets || [];

  return (
    <div className="bg-white rounded-3xl border border-amber-100 shadow-[0_8px_32px_rgba(201,162,39,0.10)] overflow-hidden flex-shrink-0 w-[420px]">

      {/* Gold top accent line */}
      <div className="h-1 w-full bg-gradient-to-r from-[#C9A227] via-[#e8c84a] to-[#A8841C]" />

      {/* Header */}
      <div
        className="px-6 pt-5 pb-4 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 tracking-tight">{month.label}</h3>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={cn("text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-sm", statusBadge)}>
                {statusLabel}
              </span>
              {totalTasks > 0 && (
                <span className="text-xs text-gray-400">
                  {doneTasks}/{totalTasks} úkolů
                  {inProgressTasks > 0 && <span className="text-[#c29c24] ml-1">· {inProgressTasks} probíhá</span>}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-[#C9A227]">{pct}%</span>
            {expanded
              ? <ChevronUp className="w-4 h-4 text-gray-400" />
              : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#C9A227] to-[#e8c84a]"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
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
            <div className="px-4 pb-4 space-y-3">

              {/* Targets — top, checkable with confetti */}
              <Section icon={Target} title="Cíle" accent="bg-gradient-to-r from-amber-50 to-yellow-50 text-[#a8841c]">
                <GoalsList
                  items={month.targets}
                  doneItems={doneTargets}
                  onUpdate={v => onUpdate({ ...month, targets: v })}
                  onUpdateDone={v => onUpdate({ ...month, doneTargets: v })}
                />
              </Section>

              {/* Tasks */}
              <Section icon={ListChecks} title="Úkoly" accent="bg-gradient-to-r from-amber-50 to-yellow-50 text-[#a8841c]">
                {visibleTasks.length === 0 && tasks.length > 0 && (
                  <p className="text-xs text-gray-400 italic px-3 py-1">Žádné úkoly odpovídající filtru</p>
                )}
                {visibleTasks.map(task => (
                  <TaskRow key={task.id} task={task} onUpdate={updateTask} onDelete={deleteTask} />
                ))}
                <AddTaskRow onAdd={addTask} />
              </Section>

              {/* Slabiny (formerly Blokery) */}
              <Section icon={AlertTriangle} title="Slabiny" accent="bg-gradient-to-r from-red-50 to-orange-50 text-red-500">
                <EditableList
                  items={month.blockers}
                  onUpdate={v => onUpdate({ ...month, blockers: v })}
                  placeholder="Nová slabina..."
                  addLabel="Přidat slabinu"
                />
              </Section>

            </div>

            {/* Footer */}
            <div className="px-5 pb-4 flex justify-end">
              <button
                onClick={() => onDelete(month.id)}
                className="text-xs text-gray-300 hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Smazat měsíc
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}