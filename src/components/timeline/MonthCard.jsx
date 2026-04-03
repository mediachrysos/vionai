import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Plus, Trash2, Check, Clock, ArrowRight, Target, AlertTriangle, Lightbulb, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  todo:        { label: "Nesplněno", color: "bg-gray-100 text-gray-400 border-gray-200",      dot: "bg-gray-300" },
  in_progress: { label: "Probíhá",   color: "bg-blue-50 text-blue-500 border-blue-200",       dot: "bg-blue-400" },
  done:        { label: "Hotovo",    color: "bg-emerald-50 text-emerald-600 border-emerald-200", dot: "bg-emerald-400" },
};

const OWNERS = ["Lukáš", "Maty", "Team", "Ostatní"];

const OWNER_COLORS = {
  "Lukáš":   "bg-violet-100 text-violet-700",
  "Maty":    "bg-sky-100 text-sky-700",
  "Team":    "bg-amber-100 text-amber-700",
  "Ostatní": "bg-gray-100 text-gray-600",
};

function TaskRow({ task, onUpdate, onDelete }) {
  const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo;
  const ownerColor = OWNER_COLORS[task.owner] || "bg-gray-100 text-gray-600";

  const cycleStatus = () => {
    const order = ["todo", "in_progress", "done"];
    const next = order[(order.indexOf(task.status) + 1) % order.length];
    onUpdate({ ...task, status: next });
  };

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-gray-50 group transition-colors">
      <button
        onClick={cycleStatus}
        title={cfg.label}
        className={cn("w-5 h-5 rounded-full flex-shrink-0 border-2 transition-all hover:scale-110", cfg.color)}
      >
        {task.status === "done" && <Check className="w-2.5 h-2.5 mx-auto" />}
        {task.status === "in_progress" && <ArrowRight className="w-2.5 h-2.5 mx-auto" />}
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
    <div className="flex items-center gap-2 mt-2 bg-gray-50 rounded-xl p-2">
      <input
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => e.key === "Enter" && submit()}
        placeholder="Název úkolu..."
        className="flex-1 text-sm bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#c29c24]"
      />
      <select
        value={owner}
        onChange={e => setOwner(e.target.value)}
        className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#c29c24]"
      >
        {OWNERS.map(o => <option key={o}>{o}</option>)}
      </select>
      <button onClick={submit} className="text-xs px-3 py-1.5 bg-[#c29c24] text-white rounded-lg hover:bg-[#a8841c] font-medium">Přidat</button>
      <button onClick={() => setOpen(false)} className="text-xs text-gray-400 hover:text-gray-600 px-1">✕</button>
    </div>
  );
}

function Section({ icon: SectionIcon, title, iconBg, children }) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-100">
      <div className={cn("flex items-center gap-2 px-3 py-2", iconBg)}>
        <SectionIcon className="w-3.5 h-3.5" />
        <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
      </div>
      <div className="px-3 py-2.5 bg-white">
        {children}
      </div>
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
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 group">
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
      {items.length === 0 && !adding && (
        <p className="text-xs text-gray-400 italic">Zatím nic</p>
      )}
      {adding ? (
        <div className="flex gap-2 mt-1">
          <input
            autoFocus
            value={newVal}
            onChange={e => setNewVal(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()}
            placeholder={placeholder}
            className="flex-1 text-sm border border-gray-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#c29c24]"
          />
          <button onClick={add} className="text-xs px-2.5 py-1 bg-[#c29c24] text-white rounded-lg font-medium">OK</button>
          <button onClick={() => { setAdding(false); setNewVal(""); }} className="text-xs text-gray-400">✕</button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#c29c24] transition-colors mt-0.5"
        >
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
  const inProgressTasks = tasks.filter(t => t.status === "in_progress").length;
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const statusLabel = pct >= 75 ? "Na cestě" : pct >= 30 ? "Probíhá" : "Pozadu";
  const statusBadge = pct >= 75
    ? "bg-emerald-100 text-emerald-700"
    : pct >= 30
    ? "bg-amber-100 text-amber-700"
    : "bg-red-100 text-red-600";
  const progressColor = pct >= 75 ? "from-emerald-400 to-emerald-500" : pct >= 30 ? "from-[#c29c24] to-[#e8c84a]" : "from-red-400 to-red-500";

  const updateTasks = (newTasks) => onUpdate({ ...month, tasks: newTasks });
  const addTask = (task) => updateTasks([...tasks, task]);
  const updateTask = (updated) => updateTasks(tasks.map(t => t.id === updated.id ? updated : t));
  const deleteTask = (id) => updateTasks(tasks.filter(t => t.id !== id));

  return (
    <div className="bg-white rounded-2xl border border-[#ececec] shadow-[0_4px_20px_rgba(0,0,0,0.06)] overflow-hidden flex-shrink-0 w-[400px]">

      {/* Header */}
      <div
        className="px-5 pt-5 pb-4 cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{month.label}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", statusBadge)}>
                {statusLabel}
              </span>
              {totalTasks > 0 && (
                <>
                  <span className="text-xs text-gray-400">{doneTasks}/{totalTasks} splněno</span>
                  {inProgressTasks > 0 && (
                    <span className="text-xs text-blue-500">{inProgressTasks} probíhá</span>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-gray-800">{pct}%</span>
            {expanded
              ? <ChevronUp className="w-4 h-4 text-gray-400" />
              : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", progressColor)}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gray-100 mx-5" />

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 py-4 space-y-3">

              {/* Priorities */}
              <Section icon={Flag} title="Priority" iconBg="bg-amber-50 text-[#c29c24]">
                <EditableList
                  items={month.priorities}
                  onUpdate={v => onUpdate({ ...month, priorities: v })}
                  placeholder="Nová priorita..."
                  addLabel="Přidat prioritu"
                />
              </Section>

              {/* Tasks */}
              <Section icon={Check} title="Úkoly" iconBg="bg-blue-50 text-blue-500">
                <div className="-mx-1">
                  {visibleTasks.length === 0 && tasks.length > 0 && (
                    <p className="text-xs text-gray-400 italic px-2">Žádné úkoly odpovídající filtru</p>
                  )}
                  {visibleTasks.map(task => (
                    <TaskRow key={task.id} task={task} onUpdate={updateTask} onDelete={deleteTask} />
                  ))}
                </div>
                <AddTaskRow onAdd={addTask} />
              </Section>

              {/* Targets */}
              <Section icon={Target} title="Cíle" iconBg="bg-emerald-50 text-emerald-600">
                <EditableList
                  items={month.targets}
                  onUpdate={v => onUpdate({ ...month, targets: v })}
                  placeholder="Nový cíl..."
                  addLabel="Přidat cíl"
                />
              </Section>

              {/* Blockers */}
              <Section icon={AlertTriangle} title="Blokery" iconBg="bg-red-50 text-red-500">
                <EditableList
                  items={month.blockers}
                  onUpdate={v => onUpdate({ ...month, blockers: v })}
                  placeholder="Nový bloker..."
                  addLabel="Přidat bloker"
                />
              </Section>

              {/* Decisions */}
              <Section icon={Lightbulb} title="Klíčová rozhodnutí" iconBg="bg-purple-50 text-purple-500">
                <EditableList
                  items={month.decisions}
                  onUpdate={v => onUpdate({ ...month, decisions: v })}
                  placeholder="Nové rozhodnutí..."
                  addLabel="Přidat rozhodnutí"
                />
              </Section>

            </div>

            {/* Footer */}
            <div className="px-5 pb-4 flex justify-end border-t border-gray-50 pt-3">
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