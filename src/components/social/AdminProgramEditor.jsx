import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { Save } from "lucide-react";

const DAYS = [
  { key: "mon", label: "Pondělí" },
  { key: "tue", label: "Úterý" },
  { key: "wed", label: "Středa" },
  { key: "thu", label: "Čtvrtek" },
  { key: "fri", label: "Pátek" },
  { key: "sat", label: "Sobota" },
  { key: "sun", label: "Neděle" },
];

export default function AdminProgramEditor({ weekStart, program, onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (program) {
      const f = {};
      DAYS.forEach(({ key }) => {
        f[`${key}_title`] = program[`${key}_title`] || "";
        f[`${key}_desc`] = program[`${key}_desc`] || "";
      });
      setForm(f);
    } else {
      const f = {};
      DAYS.forEach(({ key }) => { f[`${key}_title`] = ""; f[`${key}_desc`] = ""; });
      setForm(f);
    }
  }, [program, weekStart]);

  const handleSave = async () => {
    setSaving(true);
    const data = { week_start: weekStart, ...form };
    if (program?.id) {
      await base44.entities.WeeklyProgram.update(program.id, data);
    } else {
      await base44.entities.WeeklyProgram.create(data);
    }
    setSaving(false);
    onSaved();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Editace týdenního programu</h3>
        <Button onClick={handleSave} disabled={saving} size="sm" className="bg-[#C9A227] hover:bg-[#A8841C] text-white gap-1.5">
          <Save className="w-3.5 h-3.5" /> {saving ? "Ukládám..." : "Uložit"}
        </Button>
      </div>
      <div className="space-y-3">
        {DAYS.map(({ key, label }) => (
          <div key={key} className="bg-gray-50 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase">{label}</p>
            <Input
              placeholder="Název úkolu"
              value={form[`${key}_title`] || ""}
              onChange={e => setForm(f => ({ ...f, [`${key}_title`]: e.target.value }))}
              className="text-sm bg-white"
            />
            <Input
              placeholder="Popis úkolu"
              value={form[`${key}_desc`] || ""}
              onChange={e => setForm(f => ({ ...f, [`${key}_desc`]: e.target.value }))}
              className="text-sm bg-white"
            />
          </div>
        ))}
      </div>
    </div>
  );
}