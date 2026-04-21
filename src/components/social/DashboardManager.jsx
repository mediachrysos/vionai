import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save } from "lucide-react";

export default function DashboardManager({ dashboards, designers, onRefresh }) {
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    await base44.entities.SocialDashboard.create({
      name: newName.trim(),
      order: dashboards.length,
    });
    setNewName("");
    setSaving(false);
    onRefresh();
  };

  const handleUpdate = async (id, data) => {
    await base44.entities.SocialDashboard.update(id, data);
    onRefresh();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete dashboard?")) return;
    await base44.entities.SocialDashboard.delete(id);
    onRefresh();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-800">Manage dashboards</h3>

      <div className="space-y-2">
        {dashboards.map(db => (
          <DashboardRow
            key={db.id}
            dashboard={db}
            designers={designers}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        ))}
      </div>

      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <Input
          placeholder="New dashboard name..."
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleCreate()}
          className="text-sm"
        />
        <Button onClick={handleCreate} disabled={!newName.trim() || saving} size="sm"
          className="bg-[#C9A227] hover:bg-[#A8841C] text-white gap-1 flex-shrink-0">
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>
    </div>
  );
}

function DashboardRow({ dashboard, designers, onUpdate, onDelete }) {
  const [name, setName] = useState(dashboard.name);
  const [designerEmail, setDesignerEmail] = useState(dashboard.designer_email || "");
  const [dirty, setDirty] = useState(false);

  const handleSave = async () => {
    const designer = designers.find(d => d.email === designerEmail);
    await onUpdate(dashboard.id, {
      name,
      designer_email: designerEmail || null,
      designer_name: designer?.full_name || designerEmail || null,
    });
    setDirty(false);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap bg-gray-50 rounded-xl px-3 py-2.5">
      <Input
        value={name}
        onChange={e => { setName(e.target.value); setDirty(true); }}
        className="text-sm h-8 flex-1 min-w-[120px]"
      />
      <select
        value={designerEmail}
        onChange={e => { setDesignerEmail(e.target.value); setDirty(true); }}
        className="text-xs h-8 border border-gray-200 rounded-md px-2 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-300 flex-1 min-w-[160px]"
      >
        <option value="">— No designer —</option>
        {designers.map(d => (
          <option key={d.email} value={d.email}>{d.full_name || d.email}</option>
        ))}
      </select>
      {dirty && (
        <Button size="sm" onClick={handleSave} className="bg-[#C9A227] hover:bg-[#A8841C] text-white h-8 gap-1">
          <Save className="w-3 h-3" /> Save
        </Button>
      )}
      <button onClick={() => onDelete(dashboard.id)} className="text-gray-300 hover:text-red-400 transition-colors">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}