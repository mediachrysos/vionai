import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, ListTodo, LayoutGrid, List } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import PageHeader from "../components/ui-custom/PageHeader";
import MonthlyGoalBar from "../components/ui-custom/MonthlyGoalBar";
import EmptyState from "../components/ui-custom/EmptyState";
import TaskFormModal from "../components/tasks/TaskFormModal";
import KanbanBoard from "../components/tasks/KanbanBoard";

const priorityColors = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};
const statusLabels = { todo: "K vyřízení", in_progress: "Probíhá", done: "Hotovo" };

export default function Tasks({ currentUser }) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState("board");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const qc = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  useEffect(() => {
    if (urlParams.get("action") === "new") setShowForm(true);
  }, []);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => base44.entities.Task.list("-created_date", 500),
  });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => base44.entities.User.list() });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editing) return base44.entities.Task.update(editing.id, data);
      return base44.entities.Task.create(data);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); setShowForm(false); setEditing(null); },
  });

  const isChatter = currentUser?.role === "chatter";
  let filtered = tasks.filter(t => {
    if (isChatter && t.assignee !== currentUser?.email) return false;
    const matchSearch = !search || t.title?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <MonthlyGoalBar />
      <PageHeader title="Úkoly" subtitle={`${filtered.length} úkolů`}>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white shadow-sm shadow-amber-200">
          <Plus className="w-4 h-4 mr-2" /> Přidat úkol
        </Button>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Hledat úkoly..." className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny stavy</SelectItem>
            <SelectItem value="todo">K vyřízení</SelectItem>
            <SelectItem value="in_progress">Probíhá</SelectItem>
            <SelectItem value="done">Hotovo</SelectItem>
          </SelectContent>
        </Select>
        <Tabs value={view} onValueChange={setView}>
          <TabsList>
            <TabsTrigger value="board"><LayoutGrid className="w-4 h-4" /></TabsTrigger>
            <TabsTrigger value="table"><List className="w-4 h-4" /></TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={ListTodo} title="Žádné úkoly" actionLabel="Přidat úkol" onAction={() => setShowForm(true)} />
      ) : view === "board" ? (
        <KanbanBoard
          tasks={filtered}
          onTaskClick={(t) => { setEditing(t); setShowForm(true); }}
        />
      ) : (
        <div className="bg-white rounded-xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Úkol</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Přiřazeno</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Priorita</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Stav</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Termín</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => (
                  <motion.tr
                    key={t.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors cursor-pointer"
                    onClick={() => { setEditing(t); setShowForm(true); }}
                  >
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-medium text-gray-800">{t.title}</span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-400 hidden md:table-cell">{t.assignee_name || "—"}</td>
                    <td className="px-5 py-3.5">
                      <Badge variant="outline" className={cn("text-xs", priorityColors[t.priority])}>{t.priority}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="outline" className="text-xs">{statusLabels[t.status] || t.status}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-400 hidden md:table-cell">
                      {t.due_date ? (
                        <span className={cn(new Date(t.due_date) < new Date() && t.status !== "done" && "text-red-500 font-medium")}>
                          {format(new Date(t.due_date), "MMM d")}
                        </span>
                      ) : "—"}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TaskFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSave={saveMutation.mutateAsync}
        task={editing}
        users={users}
        currentUser={currentUser}
      />
    </div>
  );
}