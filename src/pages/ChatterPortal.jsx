import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, Users, ListTodo, CreditCard, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import StatCard from "../components/ui-custom/StatCard";
import PageHeader from "../components/ui-custom/PageHeader";

const priorityColors = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

export default function ChatterPortal({ currentUser }) {
  const email = currentUser?.email;

  const { data: payments = [] } = useQuery({
    queryKey: ["chatter-payments", email],
    queryFn: () => base44.entities.Payment.filter({ chatter_email: email }, "-created_date"),
    enabled: !!email,
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["chatter-tasks", email],
    queryFn: () => base44.entities.Task.filter({ assignee: email }, "-created_date"),
    enabled: !!email,
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["chatter-customers", email],
    queryFn: () => base44.entities.Customer.filter({ assigned_chatter: email }),
    enabled: !!email,
  });

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
  const monthPayments = payments.filter(p => (p.payment_date || p.created_date?.split("T")[0]) >= monthStart);
  const monthRev = monthPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const totalRev = payments.reduce((s, p) => s + (p.amount || 0), 0);

  const openTasks = tasks.filter(t => t.status !== "done");
  const doneTasks = tasks.filter(t => t.status === "done");
  const taskCompletionPct = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0;

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      <PageHeader
        title={`Hey, ${currentUser?.full_name?.split(" ")[0] || "there"} 👋`}
        subtitle="Here's your personal dashboard"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="This Month" value={`$${monthRev.toLocaleString()}`} icon={DollarSign} />
        <StatCard title="Total Revenue" value={`$${totalRev.toLocaleString()}`} icon={CreditCard} />
        <StatCard title="My Customers" value={customers.length} icon={Users} />
        <StatCard title="Open Tasks" value={openTasks.length} icon={ListTodo} />
      </div>

      {/* Task progress */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Task Completion</span>
            <span className="text-sm font-bold text-indigo-600">{taskCompletionPct}%</span>
          </div>
          <Progress value={taskCompletionPct} className="h-2" />
          <p className="text-xs text-slate-400 mt-2">{doneTasks.length} of {tasks.length} tasks completed</p>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Active Tasks */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ListTodo className="w-4 h-4" /> Active Tasks</CardTitle></CardHeader>
          <CardContent>
            {openTasks.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-slate-400">All caught up! No open tasks.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {openTasks.slice(0, 8).map(t => (
                  <div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{t.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className={`text-[10px] ${priorityColors[t.priority]}`}>{t.priority}</Badge>
                        {t.due_date && (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {format(new Date(t.due_date), "MMM d")}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">{t.status === "in_progress" ? "In Progress" : "To Do"}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-4 h-4" /> Recent Payments</CardTitle></CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No payments logged yet</p>
            ) : (
              <div className="space-y-2">
                {payments.slice(0, 8).map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{p.customer_name || "Customer"}</p>
                      <p className="text-xs text-slate-400">{p.model_name || "—"} · {p.created_date ? format(new Date(p.created_date), "MMM d") : "—"}</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">${(p.amount || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}