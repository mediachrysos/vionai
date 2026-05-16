import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function ChatterCustomersList({ chatterEmail, assignedModelIds = [] }) {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", model_id: assignedModelIds[0] || "" });
  const qc = useQueryClient();

  // Load all models
  const { data: allModels = [] } = useQuery({
    queryKey: ["models"],
    queryFn: () => base44.entities.Model.list(),
    staleTime: 120000
  });

  const models = allModels.filter(m => assignedModelIds.includes(m.id));

  // Load all customers filtered by assigned models
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["chatter-customers", assignedModelIds],
    queryFn: async () => {
      const allCustomers = await base44.entities.Customer.list("-created_date", 5000);
      return allCustomers.filter(c => 
        c.assigned_models?.some(mid => assignedModelIds.includes(mid))
      );
    },
    enabled: assignedModelIds.length > 0,
    staleTime: 30000
  });

  const saveMutation = useMutation({
    mutationFn: async (customerData) => {
      return base44.entities.Customer.create(customerData);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatter-customers", assignedModelIds] });
      setForm({ full_name: "", email: "", model_id: assignedModelIds[0] || "" });
      setShowForm(false);
    }
  });

  const handleAddCustomer = () => {
    if (!form.full_name || !form.model_id) return;
    saveMutation.mutate({
      full_name: form.full_name,
      email: form.email,
      assigned_models: [form.model_id],
    });
  };

  if (assignedModelIds.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
        <p className="text-sm text-gray-500">Zatím nemáte přiřazeny žádné modelky.</p>
      </div>
    );
  }

  const filtered = search
    ? customers.filter(c =>
        c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase())
      )
    : customers;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Moji zákazníci ({customers.length})</h3>
          <Button
            onClick={() => setShowForm(!showForm)}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 h-8 text-xs px-3"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Přidat zákazníka
          </Button>
        </div>

        {showForm && (
          <div className="space-y-3 mb-4 pb-4 border-b border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                placeholder="Jméno *"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="h-8 text-xs"
              />
              <Input
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Select value={form.model_id} onValueChange={(v) => setForm({ ...form, model_id: v })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Vybrat modelku *" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button
                    onClick={handleAddCustomer}
                    disabled={!form.full_name || !form.model_id || saveMutation.isPending}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs flex-1"
                  >
                    {saveMutation.isPending ? "..." : "Přidat"}
                  </Button>
                <Button
                  onClick={() => setShowForm(false)}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                >
                  Zrušit
                </Button>
              </div>
            </div>
          </div>
        )}

        {customers.length > 0 && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              placeholder="Hledat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-xs"
            />
          </div>
        )}

        {isLoading ? (
           <p className="text-xs text-gray-400">Načítám...</p>
         ) : filtered.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">
            {customers.length === 0 ? "Žádní zákazníci" : "Nenalezeni"}
          </p>
        ) : (
          <div className="space-y-1">
            {filtered.map((c) => (
              <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{c.full_name}</p>
                  {c.email && <p className="text-[10px] text-gray-400 truncate">{c.email}</p>}
                </div>
                {c.assigned_models?.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {c.assigned_models.map((mid) => {
                      const m = models.find((x) => x.id === mid);
                      return (
                        <span key={mid} className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded whitespace-nowrap">
                          {m?.name || mid}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}