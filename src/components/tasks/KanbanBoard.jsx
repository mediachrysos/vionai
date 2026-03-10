import React from "react";
import { Badge } from "@/components/ui/badge";
import { Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { motion } from "framer-motion";

const priorityColors = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
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
          <div key={col.key} className={cn("bg-slate-50/80 rounded-xl p-3 border-t-2", col.color)}>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-sm font-semibold text-slate-700">{col.label}</h3>
              <span className="text-xs text-slate-400 font-medium">{colTasks.length}</span>
            </div>
            <div className="space-y-2 min-h-[100px]">
              {colTasks.map((task, i) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => onTaskClick(task)}
                  className="bg-white rounded-lg p-3.5 border border-slate-200/60 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium text-slate-800 leading-snug">{task.title}</h4>
                    <Badge variant="outline" className={cn("text-[10px] shrink-0", priorityColors[task.priority])}>
                      {task.priority}
                    </Badge>
                  </div>
                  {task.description && (
                    <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-3">
                    {task.assignee_name && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <User className="w-3 h-3" /> {task.assignee_name}
                      </div>
                    )}
                    {task.due_date && (
                      <div className={cn("flex items-center gap-1 text-xs",
                        new Date(task.due_date) < new Date() && task.status !== "done" ? "text-red-500" : "text-slate-400"
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