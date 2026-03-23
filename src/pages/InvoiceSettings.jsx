import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/ui-custom/PageHeader";

export default function InvoiceSettings() {
  const [settings, setSettings] = useState({
    company_name: "",
    company_address: "",
    ico: "",
    dic: "",
    email: "",
    phone: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [settingsId, setSettingsId] = useState(null);

  useEffect(() => {
    const loadSettings = async () => {
      const list = await base44.entities.InvoiceSettings.list();
      if (list && list.length > 0) {
        setSettings(list[0]);
        setSettingsId(list[0].id);
      }
      setLoading(false);
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (settingsId) {
        await base44.entities.InvoiceSettings.update(settingsId, settings);
      } else {
        const created = await base44.entities.InvoiceSettings.create(settings);
        setSettingsId(created.id);
      }
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch (error) {
      alert('Chyba: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader 
        title="Nastavení faktury" 
        subtitle="Údaje o vaší firmě, které se budou automaticky doplňovat do faktur"
      />

      {loading ? (
        <p className="text-center text-gray-400">Načítám...</p>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div>
              <Label>Název firmy *</Label>
              <Input 
                value={settings.company_name || ""} 
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                placeholder="Vaše společnost, s.r.o."
                className="mt-1"
              />
            </div>

            <div>
              <Label>Sídlo firmy</Label>
              <Textarea 
                value={settings.company_address || ""} 
                onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
                placeholder="Ulice 123, 110 00 Praha 1"
                rows={2}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>IČO</Label>
                <Input 
                  value={settings.ico || ""} 
                  onChange={(e) => setSettings({ ...settings, ico: e.target.value })}
                  placeholder="12345678"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>DIČ</Label>
                <Input 
                  value={settings.dic || ""} 
                  onChange={(e) => setSettings({ ...settings, dic: e.target.value })}
                  placeholder="CZ12345678"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={settings.email || ""} 
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  placeholder="info@example.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Telefon</Label>
                <Input 
                  value={settings.phone || ""} 
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  placeholder="+420 123 456 789"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button 
                onClick={handleSave}
                disabled={saving || !settings.company_name}
                className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16]"
              >
                {done ? "✓ Uloženo!" : saving ? "Ukládám..." : "Uložit nastavení"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}