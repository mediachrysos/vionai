import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { CheckCircle, XCircle, Edit2, ExternalLink } from "lucide-react";

const statusLabels = {
  not_started: { label: "Not started", color: "text-gray-500 bg-gray-100" },
  submitted: { label: "Pending review", color: "text-amber-700 bg-amber-100" },
  approved: { label: "Approved", color: "text-emerald-700 bg-emerald-100" },
  rejected: { label: "Rejected", color: "text-red-600 bg-red-100" },
};

export default function DayDetailModal({ open, onClose, dayName, taskTitle, taskDesc, submission, weekStart, dayKey, isAdmin, onRefresh }) {
  const [link, setLink] = useState(submission?.submitted_link || "");
  const [adminNote, setAdminNote] = useState("");
  const [editNote, setEditNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState(null); // "approve" | "reject" | "edit"

  const status = submission?.status || "not_started";

  const handleSubmitLink = async () => {
    if (!link) return;
    setSaving(true);
    const data = {
      week_start: weekStart,
      day_key: dayKey,
      day_name: dayName,
      submitted_link: link,
      status: "submitted",
      submitted_at: new Date().toISOString(),
      admin_note: "",
    };
    if (submission?.id) {
      await base44.entities.DaySubmission.update(submission.id, data);
    } else {
      await base44.entities.DaySubmission.create(data);
    }
    setSaving(false);
    onRefresh();
    onClose();
  };

  const handleAdminAction = async (actionType) => {
    if (!submission?.id) return;
    setSaving(true);
    const note = actionType === "approve" ? "" : actionType === "reject" ? adminNote : editNote;
    const newStatus = actionType === "approve" ? "approved" : actionType === "reject" ? "rejected" : "rejected";
    await base44.entities.DaySubmission.update(submission.id, {
      status: newStatus,
      admin_note: note,
      reviewed_at: new Date().toISOString(),
    });
    setSaving(false);
    setAction(null);
    setAdminNote("");
    setEditNote("");
    onRefresh();
    onClose();
  };

  const cfg = statusLabels[status];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-gray-800">{dayName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Task */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Task</p>
            <p className="text-sm font-semibold text-gray-800">{taskTitle || "—"}</p>
            {taskDesc && <p className="text-xs text-gray-500 mt-1">{taskDesc}</p>}
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
            {submission?.submitted_link && (
              <a href={submission.submitted_link} target="_blank" rel="noreferrer" className="text-xs text-blue-500 flex items-center gap-1 hover:underline">
                <ExternalLink className="w-3 h-3" /> View link
              </a>
            )}
          </div>

          {/* Admin rejection note */}
          {status === "rejected" && submission?.admin_note && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <p className="text-xs font-semibold text-red-600 mb-0.5">Admin note:</p>
              <p className="text-xs text-red-500">{submission.admin_note}</p>

            </div>
          )}

          {/* Designer: submit link */}
          {!isAdmin && (status === "not_started" || status === "rejected") && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600">{status === "rejected" ? "Resubmit link:" : "Submit link:"}</p>
              <Input
                placeholder="https://..."
                value={link}
                onChange={e => setLink(e.target.value)}
                className="text-sm"
              />
              <Button onClick={handleSubmitLink} disabled={!link || saving} className="w-full bg-[#C9A227] hover:bg-[#A8841C] text-white">
                {saving ? "Submitting..." : "Submit"}
              </Button>
            </div>
          )}

          {/* Admin: review actions */}
          {isAdmin && status === "submitted" && (
            <div className="space-y-3">
              {!action && (
                <div className="flex gap-2">
                  <Button onClick={() => setAction("approve")} size="sm" className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Approve
                  </Button>
                  <Button onClick={() => setAction("edit")} size="sm" variant="outline" className="flex-1 gap-1">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </Button>
                  <Button onClick={() => setAction("reject")} size="sm" className="flex-1 bg-red-500 hover:bg-red-600 text-white gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </Button>
                </div>
              )}
              {action === "approve" && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Confirm approval?</p>
                  <div className="flex gap-2">
                    <Button onClick={() => handleAdminAction("approve")} size="sm" disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-white">Confirm</Button>
                    <Button onClick={() => setAction(null)} size="sm" variant="outline">Cancel</Button>
                  </div>
                </div>
              )}
              {action === "reject" && (
                <div className="space-y-2">
                  <Input placeholder="Rejection note (required)" value={adminNote} onChange={e => setAdminNote(e.target.value)} className="text-sm" />
                  <div className="flex gap-2">
                    <Button onClick={() => handleAdminAction("reject")} size="sm" disabled={!adminNote || saving} className="bg-red-500 hover:bg-red-600 text-white">Reject</Button>
                    <Button onClick={() => setAction(null)} size="sm" variant="outline">Cancel</Button>
                  </div>
                </div>
              )}
              {action === "edit" && (
                <div className="space-y-2">
                  <Input placeholder="What needs to be changed?" value={editNote} onChange={e => setEditNote(e.target.value)} className="text-sm" />
                  <div className="flex gap-2">
                    <Button onClick={() => handleAdminAction("edit")} size="sm" disabled={!editNote || saving} variant="outline">Send note</Button>
                    <Button onClick={() => setAction(null)} size="sm" variant="outline">Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}