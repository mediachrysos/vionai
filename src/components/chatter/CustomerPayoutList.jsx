import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Edit2, Check, X } from "lucide-react";

export default function CustomerPayoutList({ email }) {
  const qc = useQueryClient();
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  const { data: customers = [] } = useQuery({
    queryKey: ["chatter-customers", email],
    queryFn: () => base44.entities.Customer.filter({ assigned_chatter: email }),
    enabled: !!email
  });

  const updateMutation = useMutation({
    mutationFn: ({ customerId, data }) => base44.entities.Customer.update(customerId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chatter-customers", email] });
      setEditingId(null);
    }
  });

  return (
    <div className="bg-white rounded-2xl border border-[#ececec] p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-3">Moji zákazníci ({customers.length})</h3>
      
      {customers.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-6">Zatím žádní zákazníci</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {customers.map((c) => (
            <button
              key={c.id}
              onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
              className="w-full text-left px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{c.full_name}</p>
                  <p className="text-xs text-gray-400">{c.email || "—"}</p>
                </div>
                {expandedId === c.id ? (
                  <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                )}
              </div>

              {expandedId === c.id && (
                <div className="mt-2 pt-2 border-t border-gray-200 space-y-2">
                  {editingId === c.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Kdy má výplatu? (např. 15.5.2026)"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-8 text-xs flex-1"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateMutation.mutate({
                            customerId: c.id,
                            data: { payout_date: editValue }
                          });
                        }}
                        className="text-emerald-600 hover:text-emerald-700"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(null);
                        }}
                        className="text-gray-300 hover:text-gray-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="text-xs">
                        <span className="text-gray-400">Výplata: </span>
                        <span className="text-gray-800 font-semibold">{c.payout_date || "—"}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(c.id);
                          setEditValue(c.payout_date || "");
                        }}
                        className="text-[#C9A227] hover:text-[#A8841C]"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {c.total_spent && (
                    <p className="text-xs text-gray-400">Utratil: {c.total_spent?.toLocaleString()} Kč</p>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}