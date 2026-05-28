import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download } from "lucide-react";

export default function LookAlikeAudience() {
  const [search, setSearch] = useState("");

  const { data: audience = [], isLoading } = useQuery({
    queryKey: ["look-alike-audience"],
    queryFn: () => base44.entities.LookAlikeAudience.list("-total_czk", 5000),
  });

  const { data: allPayments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list("-created_date", 1000),
  });

  // Build a map: normalized full name -> total from payments DB
  const paymentTotals = useMemo(() => {
    const map = {};
    allPayments.forEach((p) => {
      if (!p.customer_name) return;
      const key = p.customer_name.trim().toLowerCase();
      map[key] = (map[key] || 0) + (p.amount || 0);
    });
    return map;
  }, [allPayments]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return audience.filter((a) => {
      const fullName = `${a.first_name || ""} ${a.last_name || ""}`.toLowerCase();
      return !q || fullName.includes(q) || (a.phone || "").includes(q);
    });
  }, [audience, search]);

  const getTotal = (a) => {
    const key = `${a.first_name || ""} ${a.last_name || ""}`.trim().toLowerCase();
    // Also try reversed (last first)
    const keyRev = `${a.last_name || ""} ${a.first_name || ""}`.trim().toLowerCase();
    const fromPayments = paymentTotals[key] || paymentTotals[keyRev] || 0;
    return fromPayments > 0 ? fromPayments : (a.total_czk || 0);
  };

  const downloadXlsx = () => {
    const rows = [
      ["Číslo", "Křestní jméno", "Příjmení", "Telefon", "Celkem (CZK)"],
      ...filtered.map((a, i) => [
        i + 1,
        a.first_name || "",
        a.last_name || "",
        a.phone || "",
        getTotal(a),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "look-alike-audience.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Look-alike Audience</h1>
          <p className="text-sm text-gray-500 mt-1">{audience.length} kontaktů</p>
        </div>
        <Button
          variant="outline"
          onClick={downloadXlsx}
          className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-2"
        >
          <Download className="w-4 h-4" />
          Export .csv
        </Button>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hledat jméno nebo telefon..."
          className="pl-10"
        />
      </div>

      <div className="bg-white rounded-xl border border-[#ececec] shadow-[0_6px_20px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3 w-12">#</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Křestní jméno</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Příjmení</th>
                <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Telefon</th>
                <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider px-5 py-3">Celkem (CZK)</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">Načítám...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">Žádné záznamy</td>
                </tr>
              ) : (
                filtered.map((a, i) => {
                  const total = getTotal(a);
                  const isFromDB = (() => {
                    const key = `${a.first_name || ""} ${a.last_name || ""}`.trim().toLowerCase();
                    const keyRev = `${a.last_name || ""} ${a.first_name || ""}`.trim().toLowerCase();
                    return (paymentTotals[key] || paymentTotals[keyRev] || 0) > 0;
                  })();
                  return (
                    <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3.5 text-sm text-gray-400">{i + 1}</td>
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-800">{a.first_name}</td>
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-800">{a.last_name}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 font-mono">{a.phone || "—"}</td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={`text-sm font-semibold ${isFromDB ? "text-emerald-600" : "text-gray-700"}`}>
                          {total > 0 ? `${total.toLocaleString()} Kč` : "—"}
                        </span>
                        {isFromDB && (
                          <span className="ml-1.5 text-[10px] text-emerald-500 bg-emerald-50 border border-emerald-100 rounded px-1 py-0.5">live</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}