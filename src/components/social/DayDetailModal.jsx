import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { ExternalLink, Link, Send, CheckCircle, XCircle, Edit2, ChevronDown, ChevronUp } from "lucide-react";

const typeColors = {
  Reels: "bg-purple-100 text-purple-700",
  Post: "bg-blue-100 text-blue-700",
  Story: "bg-pink-100 text-pink-700",
};

const statusConfig = {
  not_started: { label: "Not started", color: "bg-gray-100 text-gray-500" },
  submitted: { label: "Pending review", color: "bg-amber-100 text-amber-700" },
  approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-600" },
  edit_requested: { label: "Edit requested", color: "bg-orange-100 text-orange-600" },
};

function TaskSubmissionRow({ task, idx, taskSub, isAdmin, onSaveLink, onAdminAction, models }) {
  const [link, setLink] = useState(taskSub?.submitted_link || "");
  const [action, setAction] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => { setLink(taskSub?.submitted_link || ""); }, [taskSub]);

  const status = taskSub?.status || "not_started";
  const cfg = statusConfig[status];
  const label = task.type === "custom" ? (task.customType || "Custom") : task.type;
  const colorClass = typeColors[task.type] || "bg-amber-100 text-amber-700";
  const model = models?.find(m => m.id === task.model_id);

  const handleSubmitLink = async () => {
    if (!link) return;
    setSaving(true);
    await onSaveLink(idx, link);
    setSaving(false);
  };

  const handleAdminAction = async (actionType) => {
    setSaving(true);
    await onAdminAction(idx, actionType, note);
    setSaving(false);
    setAction(null);
    setNote("");
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Task header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colorClass}`}>{label}</span>
          {model && <span className="text-xs text-gray-400">📸 {model.name}</span>}
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="p-4 space-y-3">
          {/* Task info */}
          {task.desc && <p className="text-sm text-gray-600">{task.desc}</p>}
          {task.inspiration_link && (
            <a href={task.inspiration_link} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-blue-500 hover:underline">
              <Link className="w-3 h-3" /> Inspiration
            </a>
          )}

          {/* Admin note (rejection/edit) */}
          {taskSub?.admin_note && (status === "rejected" || status === "edit_requested") && (
            <div className={`rounded-lg px-3 py-2 ${status === "rejected" ? "bg-red-50 border border-red-200" : "bg-orange-50 border border-orange-200"}`}>
              <p className={`text-xs font-semibold mb-0.5 ${status === "rejected" ? "text-red-600" : "text-orange-600"}`}>
                {status === "rejected" ? "Rejection note:" : "Edit requested:"}
              </p>
              <p className={`text-xs ${status === "rejected" ? "text-red-500" : "text-orange-500"}`}>{taskSub.admin_note}</p>
            </div>
          )}

          {/* Submitted link display */}
          {taskSub?.submitted_link && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-600 truncate flex-1">{taskSub.submitted_link}</p>
              <a href={taskSub.submitted_link} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C9A227] hover:bg-[#A8841C] text-white text-xs font-medium rounded-lg flex-shrink-0 transition-colors">
                <ExternalLink className="w-3 h-3" /> Open
              </a>
            </div>
          )}

          {/* Designer: submit / resubmit — visible to everyone */}
          {(status === "not_started" || status === "rejected" || status === "edit_requested") && (
            <div className="flex gap-2">
              <Input
                placeholder="https://..."
                value={link}
                onChange={e => setLink(e.target.value)}
                className="text-sm"
              />
              <Button size="sm" onClick={handleSubmitLink} disabled={!link || saving}
                className="bg-[#C9A227] hover:bg-[#A8841C] text-white gap-1 flex-shrink-0">
                <Send className="w-3 h-3" /> {taskSub?.submitted_link ? "Resubmit" : "Submit"}
              </Button>
            </div>
          )}

          {/* Admin: review actions */}
          {isAdmin && status === "submitted" && !action && (
            <div className="flex gap-2">
              <Button onClick={() => handleAdminAction("approved")} size="sm" disabled={saving}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Approve
              </Button>
              <Button onClick={() => setAction("edit_requested")} size="sm" variant="outline" className="flex-1 gap-1">
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </Button>
              <Button onClick={() => setAction("rejected")} size="sm"
                className="flex-1 bg-red-500 hover:bg-red-600 text-white gap-1">
                <XCircle className="w-3.5 h-3.5" /> Reject
              </Button>
            </div>
          )}
          {isAdmin && (action === "edit_requested" || action === "rejected") && (
            <div className="space-y-2">
              <Input
                placeholder={action === "rejected" ? "Reason for rejection..." : "What needs to be changed?"}
                value={note}
                onChange={e => setNote(e.target.value)}
                className="text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleAdminAction(action)} disabled={!note || saving}
                  className={action === "rejected" ? "bg-red-500 hover:bg-red-600 text-white" : "bg-orange-500 hover:bg-orange-600 text-white"}>
                  {action === "rejected" ? "Reject" : "Send note"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setAction(null); setNote(""); }}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DayDetailModal({ open, onClose, dayName, tasks = [], submission, weekStart, dayKey, designerEmail, isAdmin, onRefresh, models = [] }) {
  const [adminLink, setAdminLink] = useState(submission?.admin_link || "");
  const [savingAdminLink, setSavingAdminLink] = useState(false);

  useEffect(() => { setAdminLink(submission?.admin_link || ""); }, [submission]);

  const getOrCreateSubmission = async (extraData = {}) => {
    if (submission?.id) return submission;
    return await base44.entities.DaySubmission.create({
      week_start: weekStart, day_key: dayKey, day_name: dayName,
      designer_email: designerEmail,
      task_submissions: [], ...extraData,
    });
  };

  const handleSaveLink = async (taskIdx, link) => {
    const sub = await getOrCreateSubmission();
    const taskSubs = [...(sub.task_submissions || [])];
    const existing = taskSubs.findIndex(t => t.task_idx === taskIdx);
    const entry = {
      task_idx: taskIdx,
      submitted_link: link,
      status: "submitted",
      admin_note: "",
      submitted_at: new Date().toISOString(),
    };
    if (existing >= 0) taskSubs[existing] = { ...taskSubs[existing], ...entry };
    else taskSubs.push(entry);
    await base44.entities.DaySubmission.update(sub.id, { task_submissions: taskSubs });
    onRefresh();
  };

  const handleAdminAction = async (taskIdx, actionType, note) => {
    if (!submission?.id) return;
    const taskSubs = [...(submission.task_submissions || [])];
    const existing = taskSubs.findIndex(t => t.task_idx === taskIdx);
    const update = { status: actionType, admin_note: note, reviewed_at: new Date().toISOString() };
    if (existing >= 0) taskSubs[existing] = { ...taskSubs[existing], ...update };
    await base44.entities.DaySubmission.update(submission.id, { task_submissions: taskSubs });
    onRefresh();
  };

  const handleSaveAdminLink = async () => {
    setSavingAdminLink(true);
    const sub = await getOrCreateSubmission();
    await base44.entities.DaySubmission.update(sub.id, { admin_link: adminLink });
    setSavingAdminLink(false);
    onRefresh();
  };

  const taskSubMap = {};
  (submission?.task_submissions || []).forEach(ts => { taskSubMap[ts.task_idx] = ts; });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-gray-800">{dayName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {tasks.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-4 text-center text-sm text-gray-400 italic">No tasks assigned for this day.</div>
          ) : (
            tasks.map((task, idx) => (
              <TaskSubmissionRow
                key={idx}
                task={task}
                idx={idx}
                taskSub={taskSubMap[idx]}
                isAdmin={isAdmin}
                onSaveLink={handleSaveLink}
                onAdminAction={handleAdminAction}
                models={models}
              />
            ))
          )}

          {/* Admin link section */}
          {isAdmin && (
            <div className="border-t border-dashed border-gray-200 pt-3 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase">Admin link</p>
              {submission?.admin_link ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-600 truncate flex-1">{submission.admin_link}</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setAdminLink(submission.admin_link)} className="text-xs text-gray-400 hover:text-gray-600 underline">Edit</button>
                    <a href={submission.admin_link} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C9A227] hover:bg-[#A8841C] text-white text-xs font-medium rounded-lg transition-colors">
                      <ExternalLink className="w-3 h-3" /> Open
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input placeholder="https://..." value={adminLink} onChange={e => setAdminLink(e.target.value)} className="text-sm" />
                  <Button size="sm" onClick={handleSaveAdminLink} disabled={!adminLink || savingAdminLink}
                    className="bg-[#C9A227] hover:bg-[#A8841C] text-white gap-1 flex-shrink-0">
                    <Send className="w-3 h-3" /> Save
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}