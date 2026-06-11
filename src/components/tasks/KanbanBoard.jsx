import React from "react";
import { Badge } from "@/components/ui/badge";
import { Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { motion } from "framer-motion";

const priorityColors = {
  low: "bg-slate-800 text-slate-400 border-white/10",
  medium: "bg-blue-950/50 text-blue-400 border-blue-700/30",
  high: "bg-orange-950/50 text-orange-400 border-orange-700/30",
  urgent: "bg-red-950/50 text-red-400 border-red-700/30",
};

const columns = [
  { key: "todo", label: "K vyřízení", color: "border-t-slate-400" },
  { key: "in_progress", label: "Probíhá", color: "border-t-blue-500" },
  { key: "done", label: "Hotovo", color: "border-t-emerald-500" },
];

export default function KanbanBoard({ tasks, onTaskClick, onStatusChange }) {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {columns.map(col => {
        const colTasks = tasks.filter(t => t.status === col.key);
        return (
          <div key={col.key} className={cn("bg-[#131929] rounded-xl p-3 border-t-2", col.color)}>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-sm font-semibold text-slate-300">{col.label}</h3>
              <span className="text-xs text-slate-500 font-medium">{colTasks.length}</span>
            </div>
            <div className="space-y-2 min-h-[100px]">
              {colTasks.map((task, i) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => onTaskClick(task)}
                  className="bg-[#1e1e1e] rounded-lg p-3.5 border border-white/10 hover:border-white/20 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium text-slate-200 leading-snug">{task.title}</h4>
                    <Badge variant="outline" className={cn("text-[10px] shrink-0", priorityColors[task.priority])}>
                      {task.priority}
                    </Badge>
                  </div>
                  {task.description && (
                    <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-3">
                    {task.assignee_name && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <User className="w-3 h-3" /> {task.assignee_name}
                      </div>
                    )}
                    {task.due_date && (
                      <div className={cn("flex items-center gap-1 text-xs",
                        new Date(task.due_date) < new Date() && task.status !== "done" ? "text-red-400" : "text-slate-500"
                      )}>
                        <Calendar className="w-3 h-3" /> {format(new Date(task.due_date), "MMM d")}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}