import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Search, CheckCircle2, XCircle, UserCircle, Ghost, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

function normalize(name) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, "").trim();
}
function isMatch(a, b) {return normalize(a) === normalize(b);}

const SCRAPER_CODE = `// ⏱️ NASTAV ČAS SCRAPOVÁNÍ (v sekundách)
const SCROLL_SECONDS = 15;
// ====== NEMEŇ NIC POD TÍMTO ŘÁDKEM ======
const UI_BLACKLIST = new Set(["All messages","All tools","Assign this conversation","Availability status","Connect to Instagram","Create messaging ad","Creator marketplace","Drop files here","Drop link here","Facebook comments","Follow up","Instagram comments","Message settings","Meta Business Suite","Open Dropdown","See contact","Unread","Ad replies","Manage","Search","Messenger","Instagram","Inbox","Chats","Today","ds Manager","Mark as done","Spam","Block","Delete"]);
const UI_KEYWORDS = ["sent a","sent an","photo","video","sticker","file","link","Ahoj","ahoj","ahoh","pusinko","prdelko","Odkud","sem ","replied to","liked","reacted","You:","typing"];
const names = new Set();
const startTime = Date.now();
const totalMs = SCROLL_SECONDS * 1000;
const countdown = setInterval(() => { const remaining = Math.ceil((totalMs - (Date.now()-startTime))/1000); if(remaining>0){console.clear();console.log(\`⏳ Scrapuji... zbývá \${remaining}s\`);} }, 1000);
const interval = setInterval(() => {
  const sidebar = document.querySelector('[data-testid="mwthreadlist-items"]') || [...document.querySelectorAll('div')].find(el=>el.scrollHeight>el.clientHeight+100&&el.clientHeight>300&&el.querySelectorAll('a').length>2);
  if(sidebar) sidebar.scrollTop+=600;
  document.querySelectorAll('span,p,div').forEach(el=>{const text=el.innerText?.trim();if(!text)return;text.split('\\n').forEach(line=>{const clean=line.trim();const words=clean.split(/\\s+/);if(words.length<2||words.length>3)return;if(UI_BLACKLIST.has(clean))return;if(UI_KEYWORDS.some(kw=>clean.includes(kw)))return;const namePattern=/^[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽÄÖÜА-ЯЁІЇЄа-яёіїє][a-záčďéěíňóřšťúůýžäöüа-яёіїєA-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽÄÖÜ'-]+$/;if(!words.every(w=>namePattern.test(w)))return;if(/\\d/.test(clean))return;names.add(clean);});});
  if(Date.now()-startTime>=totalMs){clearInterval(interval);clearInterval(countdown);const sorted=[...names].sort();console.clear();console.log("✅ Hotovo!");sorted.forEach(n=>console.log(n));console.log(\`👥 Celkem: \${sorted.length}\\n📋 Zkopíruj:\\n\`+sorted.join("\\n"));}
}, 800);`;

export default function ChatterScraperEmbed({ chatterEmail }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [results, setResults] = useState(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => base44.entities.Customer.list("-created_date", 500), staleTime: 60000 });
  const { data: models = [] } = useQuery({ queryKey: ["models"], queryFn: () => base44.entities.Model.list(), staleTime: 120000 });
  const { data: payments = [] } = useQuery({ queryKey: ["payments"], queryFn: () => base44.entities.Payment.list("-created_date", 1000), staleTime: 60000 });
  const { data: historicalCustomers = [] } = useQuery({ queryKey: ["historicalCustomers"], queryFn: () => base44.entities.HistoricalCustomer.list("-created_date", 500), staleTime: 120000 });

  const handleCopyScraper = () => {
    navigator.clipboard.writeText(SCRAPER_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSearch = () => {
    const lines = input.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    const matchedMap = new Map();
    const unmatched = [];
    lines.forEach((name) => {
      const found = customers.find((c) => isMatch(name, c.full_name || ""));
      if (found) {
        if (matchedMap.has(found.id)) matchedMap.get(found.id).inputNames.push(name);else
        matchedMap.set(found.id, { customer: found, inputNames: [name] });
      } else unmatched.push(name);
    });
    const matched = Array.from(matchedMap.values());
    const stillUnmatched = [];
    const matchedHistorical = [];
    unmatched.forEach((name) => {
      const found = historicalCustomers.find((c) => isMatch(name, c.full_name || ""));
      if (found) matchedHistorical.push({ historical: found, inputName: name });else
      stillUnmatched.push(name);
    });
    setResults({ matched, unmatched: stillUnmatched, matchedHistorical });
  };

  const modelMap = {};
  models.forEach((m) => {modelMap[m.id] = m.name;});
  const lastPaymentDate = {};
  payments.forEach((p) => {
    if (!p.customer_id) return;
    const d = p.payment_date || p.created_date?.split("T")[0];
    if (!lastPaymentDate[p.customer_id] || d > lastPaymentDate[p.customer_id]) lastPaymentDate[p.customer_id] = d;
  });

  function formatDate(dateStr) {
    if (!dateStr) return null;
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (days === 0) return "dnes";
    if (days === 1) return "včera";
    return `před ${days} dny`;
  }

  return (
    <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3 flex items-center gap-2 hover:bg-white/5 transition-colors">
        
        <div className="w-6 h-6 rounded-lg bg-[#C9A227]/15 flex items-center justify-center hidden">
          <Search className="w-3.5 h-3.5 text-[#C9A227]" />
        </div>
        <span className="text-xs font-bold text-slate-200">Customer Scraper</span>
        <span className="ml-auto text-slate-500">{open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
      </button>

      {open &&
      <div className="px-4 pb-4 space-y-3 border-t border-white/10">
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={handleCopyScraper} className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] text-white text-xs h-8">
              {copied ? <><Check className="w-3.5 h-3.5 mr-1.5" />Zkopírováno!</> : <><Copy className="w-3.5 h-3.5 mr-1.5" />Scraper kód</>}
            </Button>
          </div>
          <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={"Jan Novák\nMarie Svobodová\n..."}
          className="min-h-[120px] font-mono text-sm bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-600" />
        
          <Button size="sm" onClick={handleSearch} disabled={!input.trim()} className="bg-gradient-to-r from-[#C9A227] to-[#A8841C] text-white text-xs h-8">
            <Search className="w-3.5 h-3.5 mr-1.5" /> Najít shody
          </Button>

          {results &&
        <div className="space-y-3">
              {/* Matched */}
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2 bg-white/5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-semibold text-slate-300">Nalezené shody</span>
                  <span className="ml-auto text-xs text-slate-500">{results.matched.length}</span>
                </div>
                {results.matched.length === 0 ?
            <p className="text-xs text-slate-600 px-3 py-2">Žádné shody</p> :

            <div className="divide-y divide-white/5">
                    {results.matched.map((r) =>
              <div key={r.customer.id} className="px-3 py-2 flex items-center gap-2 hover:bg-white/5 cursor-pointer transition-colors" onClick={() => navigate(`/CustomerDetail?id=${r.customer.id}`)}>
                        <div className="w-6 h-6 rounded-full bg-[#C9A227]/20 flex items-center justify-center text-[10px] font-bold text-[#C9A227] flex-shrink-0">
                          {r.customer.full_name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-200 truncate">{r.customer.full_name}</p>
                          <p className="text-[10px] text-slate-500">{(r.customer.total_spent || 0).toLocaleString()} Kč · {formatDate(lastPaymentDate[r.customer.id])}</p>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 flex-shrink-0">✓</span>
                      </div>
              )}
                  </div>
            }
              </div>

              {/* Historical */}
              {results.matchedHistorical.length > 0 &&
          <div className="rounded-xl border border-purple-500/20 overflow-hidden">
                  <div className="px-3 py-2 border-b border-purple-500/20 flex items-center gap-2 bg-purple-500/10">
                    <Ghost className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-xs font-semibold text-slate-300">Duchové</span>
                    <span className="ml-auto text-xs text-slate-500">{results.matchedHistorical.length}</span>
                  </div>
                  <div className="divide-y divide-white/5">
                    {results.matchedHistorical.map((r, i) =>
              <div key={i} className="px-3 py-2 flex items-center gap-2">
                        <Ghost className="w-4 h-4 text-purple-400 flex-shrink-0" />
                        <p className="text-xs text-slate-300">{r.historical.full_name}</p>
                        <span className="ml-auto text-[10px] text-purple-400">{(r.historical.total_spent || 0).toLocaleString()} Kč</span>
                      </div>
              )}
                  </div>
                </div>
          }

              {/* Unmatched */}
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2 bg-white/5">
                  <XCircle className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-300">Bez shody</span>
                  <span className="ml-auto text-xs text-slate-500">{results.unmatched.length}</span>
                </div>
                {results.unmatched.length === 0 ?
            <p className="text-xs text-slate-500 px-3 py-2">Vše nalezeno 🎉</p> :

            <div className="divide-y divide-white/5">
                    {results.unmatched.map((name, i) =>
              <div key={i} className="px-3 py-2 flex items-center gap-2">
                        <UserCircle className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        <p className="text-xs text-slate-500 italic">{name}</p>
                      </div>
              )}
                  </div>
            }
              </div>
            </div>
        }
        </div>
      }
    </div>);

}