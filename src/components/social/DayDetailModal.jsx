import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { ExternalLink, Link, Send } from "lucide-react";

const typeColors = {
  Reels: "bg-purple-100 text-purple-700",
  Post: "bg-blue-100 text-blue-700",
  Story: "bg-pink-100 text-pink-700",
};

function LinkBox({ label, url, onSave, editable }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(url || "");

  useEffect(() => { setVal(url || ""); }, [url]);

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-gray-400 uppercase">{label}</p>
      {url && !editing ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-600 truncate flex-1">{url}</p>
          <div className="flex items-center gap-2 flex-shrink-0">
            {editable && (
              <button onClick={() => setEditing(true)} className="text-xs text-gray-400 hover:text-gray-600 underline">Edit</button>
            )}
            <a href={url} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C9A227] hover:bg-[#A8841C] text-white text-xs font-medium rounded-lg transition-colors">
              <ExternalLink className="w-3 h-3" /> Open
            </a>
          </div>
        </div>
      ) : editable ? (
        <div className="flex gap-2">
          <Input
            placeholder="https://..."
            value={val}
            onChange={e => setVal(e.target.value)}
            className="text-sm flex-1"
          />
          <Button size="sm" onClick={() => { onSave(val); setEditing(false); }} disabled={!val}
            className="bg-[#C9A227] hover:bg-[#A8841C] text-white gap-1">
            <Send className="w-3 h-3" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default function DayDetailModal({ open, onClose, dayName, tasks = [], submission, weekStart, dayKey, isAdmin, onRefresh, models = [] }) {
  const [saving, setSaving] = useState(false);
  const [designerLink, setDesignerLink] = useState(submission?.submitted_link || "");
  const [adminLink, setAdminLink] = useState(submission?.admin_link || "");

  useEffect(() => {
    setDesignerLink(submission?.submitted_link || "");
    setAdminLink(submission?.admin_link || "");
  }, [submission]);

  const saveField = async (field, value) => {
    setSaving(true);
    const base = {
      week_start: weekStart,
      day_key: dayKey,
      day_name: dayName,
    };
    if (submission?.id) {
      await base44.entities.DaySubmission.update(submission.id, { [field]: value });
    } else {
      await base44.entities.DaySubmission.create({ ...base, [field]: value, status: "submitted", submitted_at: new Date().toISOString() });
    }
    setSaving(false);
    onRefresh();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-gray-800">{dayName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Tasks list */}
          {tasks.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-4 text-center text-sm text-gray-400 italic">No tasks assigned for this day.</div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task, i) => {
                const label = task.type === "custom" ? (task.customType || "Custom") : task.type;
                const colorClass = typeColors[task.type] || "bg-amber-100 text-amber-700";
                return (
                  <div key={i} className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${colorClass}`}>{label}</span>
                    </div>
                    {task.desc && <p className="text-sm text-gray-700">{task.desc}</p>}
                    {task.model_id && (() => {
                      const m = models.find(x => x.id === task.model_id);
                      return m ? <p className="text-xs text-gray-400">📸 {m.name}</p> : null;
                    })()}
                    {task.inspiration_link && (
                      <a href={task.inspiration_link} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs text-blue-500 hover:underline">
                        <Link className="w-3 h-3" /> Inspiration
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t border-dashed border-gray-200" />

          {/* Designer link */}
          <LinkBox
            label="Designer's link"
            url={designerLink}
            editable={!isAdmin}
            onSave={(val) => { setDesignerLink(val); saveField("submitted_link", val); }}
          />
          {!isAdmin && !designerLink && (
            <div className="space-y-1 -mt-3">
              <p className="text-xs font-semibold text-gray-400 uppercase">Designer's link</p>
              <div className="flex gap-2">
                <Input placeholder="https://..." value={designerLink} onChange={e => setDesignerLink(e.target.value)} className="text-sm" />
                <Button size="sm" onClick={() => saveField("submitted_link", designerLink)} disabled={!designerLink || saving}
                  className="bg-[#C9A227] hover:bg-[#A8841C] text-white gap-1">
                  <Send className="w-3 h-3" /> Submit
                </Button>
              </div>
            </div>
          )}

          {/* Admin link */}
          <LinkBox
            label="Admin's link"
            url={adminLink}
            editable={isAdmin}
            onSave={(val) => { setAdminLink(val); saveField("admin_link", val); }}
          />
          {isAdmin && !adminLink && (
            <div className="space-y-1 -mt-3">
              <p className="text-xs font-semibold text-gray-400 uppercase">Admin's link</p>
              <div className="flex gap-2">
                <Input placeholder="https://..." value={adminLink} onChange={e => setAdminLink(e.target.value)} className="text-sm" />
                <Button size="sm" onClick={() => saveField("admin_link", adminLink)} disabled={!adminLink || saving}
                  className="bg-[#C9A227] hover:bg-[#A8841C] text-white gap-1">
                  <Send className="w-3 h-3" /> Save
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}