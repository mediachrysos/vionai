import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Search, CheckCircle2, XCircle, UserCircle, Ghost, Copy, Check } from "lucide-react";
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
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const SCRAPER_CODE = `// ⏱️ NASTAV ČAS SCRAPOVÁNÍ (v sekundách)
const SCROLL_SECONDS = 15;

// ====== NEMEŇ NIC POD TÍMTO ŘÁDKEM ======

// UI blacklist – přesné fráze
const UI_BLACKLIST = new Set([
  "All messages", "All tools", "Assign this conversation", "Availability status",
  "Connect to Instagram", "Create messaging ad", "Creator marketplace",
  "Drop files here", "Drop link here", "Facebook comments", "Follow up",
  "Instagram comments", "Message settings", "Meta Business Suite",
  "Open Dropdown", "See contact", "Unread", "Ad replies", "Manage",
  "Search", "Messenger", "Instagram", "Inbox", "Chats", "Today",
  "ds Manager", "Mark as done", "Spam", "Block", "Delete"
]);

// Slova která se v UI textech vyskytují → celý řádek ignorujeme
const UI_KEYWORDS = [
  "sent a", "sent an", "photo", "video", "sticker", "file", "link",
  "Ahoj", "ahoj", "ahoh", "pusinko", "prdelko", "Odkud", "sem ",
  "replied to", "liked", "reacted", "You:", "typing"
];

const names = new Set();
const startTime = Date.now();
const totalMs = SCROLL_SECONDS * 1000;

// Odpočet v konzoli
const countdown = setInterval(() => {
  const elapsed = Date.now() - startTime;
  const remaining = Math.ceil((totalMs - elapsed) / 1000);
  if (remaining > 0) {
    console.clear();
    console.log(\`⏳ Scrapuji... zbývá \${remaining} sekund\`);
    console.log(\`📋 Nalezeno zatím: \${names.size} jmen\`);
  }
}, 1000);

const interval = setInterval(() => {
  // Scrollování seznamu
  const sidebar = document.querySelector('[data-testid="mwthreadlist-items"]')
    || [...document.querySelectorAll('div')].find(el =>
        el.scrollHeight > el.clientHeight + 100 &&
        el.clientHeight > 300 &&
        el.querySelectorAll('a').length > 2
      );
  if (sidebar) sidebar.scrollTop += 600;

  // Sběr a filtrování jmen
  document.querySelectorAll('span, p, div').forEach(el => {
    const text = el.innerText?.trim();
    if (!text) return;

    text.split('\\n').forEach(line => {
      const clean = line.trim();

      // Základní délka
      const words = clean.split(/\\s+/);
      if (words.length < 2 || words.length > 3) return;

      // UI blacklist – přesná shoda
      if (UI_BLACKLIST.has(clean)) return;

      // UI keywords – pokud řádek obsahuje, přeskočíme
      if (UI_KEYWORDS.some(kw => clean.includes(kw))) return;

      // Každé slovo musí začínat velkým písmenem a obsahovat jen písmena/pomlčku
      const namePattern = /^[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽÄÖÜА-ЯЁІЇЄа-яёіїє][a-záčďéěíňóřšťúůýžäöüа-яёіїєA-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽÄÖÜ'-]+$/;
      if (!words.every(w => namePattern.test(w))) return;

      // Nesmí obsahovat čísla
      if (/\\d/.test(clean)) return;

      names.add(clean);
    });
  });

  // Konec
  if (Date.now() - startTime >= totalMs) {
    clearInterval(interval);
    clearInterval(countdown);

    const sorted = [...names].sort();
    console.clear();
    console.log("✅ Hotovo!");
    console.log("========== SEZNAM JMEN ==========");
    sorted.forEach(n => console.log(n));
    console.log("=================================");
    console.log(\`👥 Celkem unikátních jmen: \${sorted.length}\`);
    console.log("\\n📋 Zkopíruj níže:\\n" + sorted.join("\\n"));
  }
}, 800);`;

  const handleCopyScraper = () => {
    navigator.clipboard.writeText(SCRAPER_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 500),
  });

  const { data: models = [] } = useQuery({
    queryKey: ["models"],
    queryFn: () => base44.entities.Model.list(),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payments"],
    queryFn: () => base44.entities.Payment.list("-created_date", 1000),
  });

  const { data: historicalCustomers = [] } = useQuery({
    queryKey: ["historicalCustomers"],
    queryFn: () => base44.entities.HistoricalCustomer.list("-created_date", 500),
  });

  const handleSearch = () => {
    const lines = input
      .split("\n")
      .map(l => l.trim())
      .filter(l => l.length > 0);

    // Build map: customer.id -> { customer, inputNames[] }
    const matchedMap = new Map();
    const unmatched = [];

    lines.forEach(name => {
      const found = customers.find(c => isMatch(name, c.full_name || ""));
      if (found) {
        if (matchedMap.has(found.id)) {
          matchedMap.get(found.id).inputNames.push(name);
        } else {
          matchedMap.set(found.id, { customer: found, inputNames: [name] });
        }
      } else {
        unmatched.push(name);
      }
    });

    const matched = Array.from(matchedMap.values());

    // Check unmatched against historical customers
    const stillUnmatched = [];
    const matchedHistorical = [];

    unmatched.forEach(name => {
      const found = historicalCustomers.find(c => isMatch(name, c.full_name || ""));
      if (found) {
        matchedHistorical.push({ historical: found, inputName: name });
      } else {
        stillUnmatched.push(name);
      }
    });

    setResults({ matched, unmatched: stillUnmatched, matchedHistorical });
  };

  const modelMap = {};
  models.forEach(m => { modelMap[m.id] = m.name; });

  // Last payment date per customer
  const lastPaymentDate = {};
  payments.forEach(p => {
    if (!p.customer_id) return;
    const d = p.payment_date || p.created_date?.split("T")[0];
    if (!lastPaymentDate[p.customer_id] || d > lastPaymentDate[p.customer_id]) {
      lastPaymentDate[p.customer_id] = d;
    }
  });

  function formatDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days === 0) return "dnes";
    if (days === 1) return "včera";
    return `před ${days} dny`;
  }

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
        <div className="mt-4 flex gap-3 flex-wrap">
          <Button
            onClick={handleSearch}
            disabled={!input.trim()}
            className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white shadow-sm"
          >
            <Search className="w-4 h-4 mr-2" /> Najít shody
          </Button>
          <Button
            onClick={handleCopyScraper}
            className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] hover:from-[#A8841C] hover:to-[#8a6c16] text-white shadow-sm"
          >
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? "Zkopírováno!" : "Scraper kód"}
          </Button>
        </div>
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
                  const assignedModelNames = (r.customer.assigned_models || []).map(id => modelMap[id]).filter(Boolean);
                  const lastDate = lastPaymentDate[r.customer.id];
                  const inputName = r.inputNames[0];
                  const nameMatches = normalize(inputName) === normalize(r.customer.full_name);
                  const showOriginal = !nameMatches || r.inputNames.length > 1;

                  return (
                    <div
                      key={r.customer.id}
                      className="px-5 py-3.5 flex items-start gap-3 hover:bg-gray-50/60 cursor-pointer transition-colors"
                      onClick={() => navigate(`/CustomerDetail?id=${r.customer.id}`)}
                    >
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-xs font-semibold text-amber-700 flex-shrink-0 mt-0.5">
                        {r.customer.full_name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-800">{r.customer.full_name}</p>
                          {showOriginal && (
                            <span className="text-xs text-gray-400 italic">
                              (scraped: {r.inputNames.join(", ")})
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-0.5">
                          <span className="text-xs text-gray-500">
                            💰 <span className="font-semibold text-gray-700">{(r.customer.total_spent || 0).toLocaleString()} Kč</span>
                          </span>
                          {assignedModelNames.length > 0 && (
                            <span className="text-xs text-gray-500">
                              🎭 {assignedModelNames.join(", ")}
                            </span>
                          )}
                          {lastDate && (
                            <span className="text-xs text-gray-400">
                              🕐 poslední platba {formatDate(lastDate)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 flex-shrink-0">
                        Přesná shoda
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Historical / Ghost matches */}
          {results.matchedHistorical.length > 0 && (
            <div className="bg-white rounded-xl border border-purple-100 shadow-[0_6px_20px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-purple-50 flex items-center gap-2 bg-purple-50/50">
                <Ghost className="w-4 h-4 text-purple-400" />
                <span className="font-semibold text-gray-800 text-sm">Duchové — historičtí zákazníci</span>
                <span className="ml-auto text-xs text-gray-400">{results.matchedHistorical.length} shod</span>
              </div>
              <div className="divide-y divide-gray-50">
                {results.matchedHistorical.map((r, i) => {
                  const showOriginal = normalize(r.inputName) !== normalize(r.historical.full_name);
                  return (
                    <div key={i} className="px-5 py-3.5 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-semibold text-purple-600 flex-shrink-0 mt-0.5">
                        <Ghost className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-700">{r.historical.full_name}</p>
                          {showOriginal && (
                            <span className="text-xs text-gray-400 italic">(scraped: {r.inputName})</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          💰 historická útrata: <span className="font-semibold text-gray-700">{(r.historical.total_spent || 0).toLocaleString()} Kč</span>
                        </p>
                      </div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 flex-shrink-0">
                        👻 Duch
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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