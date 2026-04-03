import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Map, Filter, User, Pencil, Check, X } from "lucide-react";
import { motion } from "framer-motion";
import MonthCard from "@/components/timeline/MonthCard";

const MONTH_NAMES_CZ = ["Leden","Únor","Březen","Duben","Květen","Červen","Červenec","Srpen","Září","Říjen","Listopad","Prosinec"];
const OWNERS = ["Lukáš", "Maty", "Team", "Ostatní"];

const SEED_DATA = [
  {
    month_key: "2026-04", label: "Duben 2026", order: 1,
    priorities: ["Stabilizovat reklamní systém", "Spustit strukturované skripty", "Opravit FB business setup"],
    tasks: [
      { id: "t1", title: "Vytvořit 3 reklamy na modelku", owner: "Lukáš", status: "in_progress" },
      { id: "t2", title: "Napsat spam skript", owner: "Lukáš", status: "todo" },
      { id: "t3", title: "Dokončit FB verifikaci", owner: "Lukáš", status: "todo" },
    ],
    targets: ["2 aktivní modelky", "5 000 Kč/den na modelku"],
    blockers: ["Reklamy ještě nejsou konzistentní"],
    decisions: [],
  },
  {
    month_key: "2026-05", label: "Květen 2026", order: 2,
    priorities: ["Zvládnout sníženou kapacitu (maturita Maty)", "Otestovat Instagram funnel"],
    tasks: [
      { id: "t4", title: "Definovat role (chat vs obsah)", owner: "Lukáš", status: "todo" },
      { id: "t5", title: "Spustit IG test", owner: "Maty", status: "todo" },
    ],
    targets: ["Udržet stabilitu příjmů"],
    blockers: ["Omezená kapacita (maturita)"],
    decisions: [],
  },
  {
    month_key: "2026-06", label: "Červen 2026", order: 3,
    priorities: ["Škálovat modelky", "Zahájit automatizaci (bot)"],
    tasks: [
      { id: "t6", title: "Spustit 1–2 nové modelky", owner: "Team", status: "todo" },
      { id: "t7", title: "Zahájit vývoj bota", owner: "Lukáš", status: "todo" },
    ],
    targets: ["3–4 aktivní modelky"],
    blockers: [],
    decisions: [],
  },
  {
    month_key: "2026-07", label: "Červenec 2026", order: 4,
    priorities: ["Delegovat chatting", "Budovat tým"],
    tasks: [
      { id: "t8", title: "Nabrat chattery", owner: "Lukáš", status: "todo" },
      { id: "t9", title: "Zapracovat operátory", owner: "Lukáš", status: "todo" },
    ],
    targets: ["5+ modelek"],
    blockers: [],
    decisions: [],
  },
  {
    month_key: "2026-08", label: "Srpen 2026", order: 5,
    priorities: ["Škálovat systém", "Připravit expanzi"],
    tasks: [
      { id: "t10", title: "Plán US společnosti", owner: "Lukáš", status: "todo" },
      { id: "t11", title: "Průzkum platebního providera", owner: "Lukáš", status: "todo" },
    ],
    targets: ["Stabilní multi-modelkový provoz"],
    blockers: [],
    decisions: [],
  },
];

export default function BusinessTimeline() {
  const qc = useQueryClient();
  const scrollRef = useRef(null);
  const [filterOwner, setFilterOwner] = useState("all");
  const [filterIncomplete, setFilterIncomplete] = useState(false);
  const [addingMonth, setAddingMonth] = useState(false);
  const [newMonthLabel, setNewMonthLabel] = useState("");
  const [newMonthKey, setNewMonthKey] = useState("");

  const { data: months = [], isLoading } = useQuery({
    queryKey: ["timelineMonths"],
    queryFn: async () => {
      const data = await base44.entities.TimelineMonth.list("order", 20);
      if (data.length === 0) {
        // Seed initial data
        for (const m of SEED_DATA) {
          await base44.entities.TimelineMonth.create(m);
        }
        return base44.entities.TimelineMonth.list("order", 20);
      }
      return data;
    },
    staleTime: 30000,
  });

  const updateMutation = useMutation({
    mutationFn: (month) => base44.entities.TimelineMonth.update(month.id, month),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["timelineMonths"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TimelineMonth.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["timelineMonths"] }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TimelineMonth.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["timelineMonths"] }); setAddingMonth(false); setNewMonthLabel(""); setNewMonthKey(""); },
  });

  const addMonth = () => {
    if (!newMonthLabel.trim() || !newMonthKey.trim()) return;
    createMutation.mutate({
      month_key: newMonthKey,
      label: newMonthLabel,
      order: (months.length ? Math.max(...months.map(m => m.order)) + 1 : 1),
      priorities: [], tasks: [], targets: [], blockers: [], decisions: [],
    });
  };

  const sorted = [...months].sort((a, b) => a.order - b.order);
  const totalTasks = months.flatMap(m => m.tasks || []);
  const doneTasks = totalTasks.filter(t => t.status === "done").length;
  const overallPct = totalTasks.length > 0 ? Math.round((doneTasks / totalTasks.length) * 100) : 0;

  return (
    <div className="p-4 lg:p-8 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shadow-sm">
            <Map className="w-5 h-5 text-[#c29c24]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Business Timeline</h1>
            <p className="text-sm text-gray-400">Strategická mapa · výkon · priority</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Owner filter */}
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl px-3 py-1.5">
            <User className="w-3.5 h-3.5 text-gray-400" />
            <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)} className="text-xs text-gray-700 focus:outline-none bg-transparent">
              <option value="all">Všichni</option>
              {OWNERS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          {/* Incomplete filter */}
          <button
            onClick={() => setFilterIncomplete(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${filterIncomplete ? "bg-[#c29c24] text-white border-[#c29c24]" : "bg-white border-gray-200 text-gray-500 hover:border-[#c29c24]"}`}
          >
            <Filter className="w-3.5 h-3.5" /> Jen nesplněné
          </button>
          <button
            onClick={() => setAddingMonth(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#c29c24] to-[#a8841c] text-white text-xs font-medium hover:from-[#a8841c] hover:to-[#8a6c16] shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Přidat měsíc
          </button>
        </div>
      </div>

      {/* Overall progress */}
      <div className="bg-white rounded-xl border border-[#ececec] shadow-[0_4px_16px_rgba(0,0,0,0.04)] px-5 py-3.5 mb-6 flex items-center gap-5">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Celkový postup</span>
            <span className="text-xs font-bold text-[#c29c24]">{overallPct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#c29c24] to-[#e8c84a]"
              initial={{ width: 0 }}
              animate={{ width: `${overallPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-bold text-gray-800">{doneTasks}<span className="text-sm font-normal text-gray-400">/{totalTasks.length}</span></p>
          <p className="text-xs text-gray-400">úkolů hotovo</p>
        </div>
      </div>

      {/* Add month form */}
      {addingMonth && (
        <div className="bg-white rounded-xl border border-[#e8d99a] shadow-sm px-5 py-4 mb-6 flex flex-wrap items-center gap-3">
          <input value={newMonthLabel} onChange={e => setNewMonthLabel(e.target.value)} placeholder="Název, např. Září 2026" className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#c29c24] w-48" />
          <input value={newMonthKey} onChange={e => setNewMonthKey(e.target.value)} placeholder="Klíč, např. 2026-09" className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#c29c24] w-36" />
          <button onClick={addMonth} disabled={createMutation.isPending} className="px-4 py-1.5 bg-[#c29c24] text-white text-sm rounded-lg hover:bg-[#a8841c]">Vytvořit</button>
          <button onClick={() => setAddingMonth(false)} className="text-sm text-gray-400 hover:text-gray-600">Zrušit</button>
        </div>
      )}

      {/* Timeline scroll */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-[#c29c24] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div ref={scrollRef} className="flex gap-5 overflow-x-auto pb-6" style={{ scrollSnapType: "x mandatory" }}>
          {sorted.map((month, i) => (
            <motion.div
              key={month.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{ scrollSnapAlign: "start" }}
            >
              <MonthCard
                month={month}
                filterOwner={filterOwner}
                filterIncomplete={filterIncomplete}
                onUpdate={(updated) => updateMutation.mutate(updated)}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}