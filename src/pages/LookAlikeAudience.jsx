import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function LookAlikeAudience() {
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const qc = useQueryClient();

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke("syncLookAlikeAudience", {});
      toast.success(res.data?.message || "Synchronizováno");
      qc.invalidateQueries({ queryKey: ["look-alike-audience"] });
    } catch (e) {
      toast.error("Chyba při synchronizaci");
    } finally {
      setSyncing(false);
    }
  };

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
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-100">Look-alike Audience</h1>
          <p className="text-sm text-slate-500 mt-1">{audience.length} kontaktů</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSync}
            disabled={syncing}
            className="border-white/10 text-slate-300 hover:bg-white/5 gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            Synchronizovat
          </Button>
          <Button
            variant="outline"
            onClick={downloadXlsx}
            className="border-white/10 text-slate-300 hover:bg-white/5 gap-2"
          >
            <Download className="w-4 h-4" />
            Export .csv
          </Button>
        </div>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hledat jméno nebo telefon..."
          className="pl-10"
        />
      </div>

      <div className="bg-[#1e1e1e] rounded-xl border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.3)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3 w-12">#</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Křestní jméno</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Příjmení</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Telefon</th>
                <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">Celkem (CZK)</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500 text-sm">Načítám...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-500 text-sm">Žádné záznamy</td>
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
                    <tr key={a.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-5 py-3.5 text-sm text-slate-500">{i + 1}</td>
                      <td className="px-5 py-3.5 text-sm font-medium text-slate-200">{a.first_name}</td>
                      <td className="px-5 py-3.5 text-sm font-medium text-slate-200">{a.last_name}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-400 font-mono">{a.phone || "—"}</td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={`text-sm font-semibold ${isFromDB ? "text-emerald-400" : "text-slate-300"}`}>
                          {total > 0 ? `${total.toLocaleString()} Kč` : "—"}
                        </span>
                        {isFromDB && (
                          <span className="ml-1.5 text-[10px] text-emerald-400 bg-emerald-950/50 border border-emerald-700/30 rounded px-1 py-0.5">live</span>
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