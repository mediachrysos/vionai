import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Search, CheckCircle2, XCircle, UserCircle } from "lucide-react";

import { useNavigate } from "react-router-dom";

function normalize(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function isMatch(a, b) {
  return normalize(a) === normalize(b);
}

export default function CustomerScraper() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState(null);
  const navigate = useNavigate();

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 500),
  });

  const { data: models = [] } = useQuery({
    queryKey: ["models"],
    queryFn: () => base44.entities.Model.list(),
  });

  const handleSearch = () => {
    const lines = input
      .split("\n")
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const matched = [];
    const unmatched = [];

    lines.forEach(name => {
      const found = customers.find(c => isMatch(name, c.full_name || ""));
      if (found) {
        matched.push({ inputName: name, customer: found });
      } else {
        unmatched.push(name);
      }
    });

    setResults({ matched, unmatched });
  };

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Customer Matcher</h1>
        <p className="text-sm text-gray-400">Vlož jména z Messengeru (každé jméno na nový řádek) a najdeme shody s vašimi zákazníky.</p>
      </div>

      <div className="bg-white rounded-xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Jména z Messengeru</label>
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={"Jan Novák\nMarie Svobodová\nPetr Dvořák\n..."}
          className="min-h-[180px] font-mono text-sm"
        />
        <Button
          onClick={handleSearch}
          disabled={!input.trim()}
          className="mt-4 bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white shadow-sm"
        >
          <Search className="w-4 h-4 mr-2" /> Najít shody
        </Button>
      </div>

      {results && (
        <div className="space-y-6">
          {/* Matched */}
          <div className="bg-white rounded-xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="font-semibold text-gray-800 text-sm">Nalezené shody</span>
              <span className="ml-auto text-xs text-gray-400">{results.matched.length} zákazníků</span>
            </div>
            {results.matched.length === 0 ? (
              <p className="text-sm text-gray-400 px-5 py-4">Žádné shody nenalezeny.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {results.matched.map((r, i) => {
                  const modelMap = {};
                  models.forEach(m => { modelMap[m.id] = m.name; });
                  const assignedModelNames = (r.customer.assigned_models || []).map(id => modelMap[id]).filter(Boolean);
                  return (
                    <div
                      key={i}
                      className="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50/60 cursor-pointer transition-colors"
                      onClick={() => navigate(`/CustomerDetail?id=${r.customer.id}`)}
                    >
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-xs font-semibold text-amber-700 flex-shrink-0">
                        {r.customer.full_name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{r.customer.full_name}</p>
                        <div className="flex flex-wrap gap-2 mt-0.5">
                          <span className="text-xs text-gray-500">
                            💰 <span className="font-semibold text-gray-700">{(r.customer.total_spent || 0).toLocaleString()} Kč</span>
                          </span>
                          {assignedModelNames.length > 0 && (
                            <span className="text-xs text-gray-500">
                              🎭 {assignedModelNames.join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                        Přesná shoda
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Unmatched */}
          <div className="bg-white rounded-xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-gray-400" />
              <span className="font-semibold text-gray-800 text-sm">Bez shody</span>
              <span className="ml-auto text-xs text-gray-400">{results.unmatched.length} jmen</span>
            </div>
            {results.unmatched.length === 0 ? (
              <p className="text-sm text-gray-400 px-5 py-4">Všechna jména byla nalezena.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {results.unmatched.map((name, i) => (
                  <div key={i} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <UserCircle className="w-4 h-4 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500 italic">{name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}