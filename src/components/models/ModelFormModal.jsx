import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Bot, Users, FileText, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { base44 } from "@/api/base44Client";

const TABS = [
  { id: "info", label: "Základní info", icon: Bot },
  { id: "story", label: "Story", icon: FileText },
  { id: "chatters", label: "Chatteři", icon: Users },
];

export default function ModelFormModal({ open, onClose, onSave, model, users }) {
  const [form, setForm] = useState({ name: "", status: "active", notes: "", story: "", assigned_chatters: [], profile_photo: "" });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (model) setForm({ ...model, assigned_chatters: model.assigned_chatters || [], story: model.story || "", profile_photo: model.profile_photo || "" });
    else setForm({ name: "", status: "active", notes: "", story: "", assigned_chatters: [], profile_photo: "" });
    setActiveTab("info");
  }, [model, open]);

  const handleSubmit = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const toggleChatter = (email) => {
    setForm(prev => ({
      ...prev,
      assigned_chatters: prev.assigned_chatters.includes(email)
        ? prev.assigned_chatters.filter(e => e !== email)
        : [...prev.assigned_chatters, email]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] px-6 py-5 rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{model ? "Upravit modelku" : "Přidat modelku"}</h2>
              <p className="text-amber-100 text-xs">{model?.name || "Nová modelka"}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50/50">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all",
                  activeTab === tab.id
                    ? "border-b-2 border-[#C9A227] text-[#C9A227] bg-white"
                    : "text-gray-400 hover:text-gray-600"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-4 p-6">
          {activeTab === "info" && (
            <>
              <div>
                <Label>Jméno modelky *</Label>
                <Input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Jméno modelky" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktivní</SelectItem>
                    <SelectItem value="inactive">Neaktivní</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Interní poznámky</Label>
                <Textarea value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} rows={3} placeholder="Interní poznámky..." />
              </div>
            </>
          )}

          {activeTab === "story" && (
            <div>
              <Label>Story modelky</Label>
              <p className="text-xs text-gray-400 mb-2">Pozadí příběhu modelky — používá se chattery při komunikaci se zákazníky.</p>
              <Textarea
                value={form.story}
                onChange={e => setForm(prev => ({ ...prev, story: e.target.value }))}
                rows={12}
                placeholder="Napiš příběh, background, osobnostní rysy, zájmy, způsob komunikace..."
                className="font-mono text-sm"
              />
            </div>
          )}

          {activeTab === "chatters" && (
            <div>
              <Label>Přiřazení chatteři</Label>
              <p className="text-xs text-gray-400 mb-3">Klikni na chattera pro přiřazení / odebrání</p>
              <div className="flex flex-wrap gap-2">
                {users?.map(u => (
                  <Badge
                    key={u.email}
                    variant={form.assigned_chatters.includes(u.email) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer transition-all",
                      form.assigned_chatters.includes(u.email)
                        ? "bg-[#C9A227] text-white border-[#C9A227] hover:bg-[#A8841C]"
                        : "hover:border-[#C9A227] hover:text-[#C9A227]"
                    )}
                    onClick={() => toggleChatter(u.email)}
                  >
                    {u.full_name}
                    {form.assigned_chatters.includes(u.email) && <X className="w-3 h-3 ml-1" />}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={onClose}>Zrušit</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.name || saving}
              className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white"
            >
              {saving ? "Ukládám..." : model ? "Uložit" : "Vytvořit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}