import React, { useState, useEffect } from "react";
import { ArrowLeft, Phone, CalendarDays, CreditCard, FileText, Pencil, Check, Package, X, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

function parseContent(text) {
  const lines = (text || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const groups = [];
  let current = null;
  for (const line of lines) {
    const headerMatch = !line.includes(":") ? null : line.match(/^([^:]{2,40}):\s*(.*)$/);
    if (line.endsWith(":")) {
      current = { title: line.slice(0, -1), items: [] };
      groups.push(current);
    } else if (headerMatch && headerMatch[2] === "") {
      current = { title: headerMatch[1], items: [] };
      groups.push(current);
    } else if (headerMatch && !current) {
      current = { title: headerMatch[1], items: [headerMatch[2]] };
      groups.push(current);
    } else if (current) {
      current.items.push(line);
    } else {
      current = { title: null, items: [line] };
      groups.push(current);
    }
  }
  return groups;
}

function serializeGroups(groups) {
  const lines = [];
  groups.forEach((g) => {
    if (g.title) lines.push(`${g.title}:`);
    g.items.forEach((item) => lines.push(item));
  });
  return lines.join("\n");
}

const parsePhone = (phone) => {
  if (!phone) return { code: "+420", local: "" };
  if (phone.startsWith("+421")) return { code: "+421", local: phone.slice(4) };
  if (phone.startsWith("+420")) return { code: "+420", local: phone.slice(4) };
  return { code: "+420", local: phone };
};

function PackageTile({ item, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(item);

  const save = () => {
    setEditing(false);
    if (value.trim() && value !== item) onSave(value.trim());
    else if (!value.trim()) onDelete();
  };

  if (editing) {
    return (
      <div className="flex items-start gap-2 bg-white/[0.03] border border-[#C9A227]/30 rounded-lg p-2.5">
        <Package className="w-3.5 h-3.5 text-slate-600 mt-0.5 flex-shrink-0" />
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
          className="flex-1 bg-transparent outline-none text-xs text-slate-200" />
      </div>
    );
  }

  return (
    <div className="group relative flex items-start gap-2 bg-white/[0.03] border border-white/5 rounded-lg p-2.5">
      <Package className="w-3.5 h-3.5 text-slate-600 mt-0.5 flex-shrink-0" />
      <p className="text-xs text-slate-300 leading-snug flex-1">{item}</p>
      <div className="absolute top-1 right-1 hidden group-hover:flex items-center gap-0.5 bg-[#1e1e1e] rounded-md">
        <button onClick={() => setEditing(true)} className="text-slate-500 hover:text-[#C9A227] p-1"><Pencil className="w-3 h-3" /></button>
        <button onClick={onDelete} className="text-slate-500 hover:text-red-400 p-1"><X className="w-3 h-3" /></button>
      </div>
    </div>
  );
}

export default function ChattingCustomerCard({ customer, payments, onUpdate }) {
  const urlParams = new URLSearchParams(window.location.search);
  const chatterEmail = urlParams.get("chatter");
  const backUrl = createPageUrl("ChatterPortal") + (chatterEmail ? `?chatter=${encodeURIComponent(chatterEmail)}` : "");
  const [groups, setGroups] = useState(() => parseContent(customer.sent_content));
  const [phoneCode, setPhoneCode] = useState("+420");
  const [phoneLocal, setPhoneLocal] = useState("");
  const totalSpent = payments.reduce((s, p) => s + (p.amount || 0), 0);

  useEffect(() => {
    setGroups(parseContent(customer.sent_content));
  }, [customer.sent_content]);

  useEffect(() => {
    const parsed = parsePhone(customer.phone);
    setPhoneCode(parsed.code);
    setPhoneLocal(parsed.local);
  }, [customer.phone]);

  const commitGroups = (nextGroups) => {
    setGroups(nextGroups);
    onUpdate({ sent_content: serializeGroups(nextGroups) });
  };

  const updateItem = (gi, ii, value) => {
    const next = groups.map((g, i) => i === gi ? { ...g, items: g.items.map((it, j) => j === ii ? value : it) } : g);
    commitGroups(next);
  };

  const deleteItem = (gi, ii) => {
    const next = groups
      .map((g, i) => i === gi ? { ...g, items: g.items.filter((_, j) => j !== ii) } : g)
      .filter((g) => g.items.length > 0 || g.title === null);
    commitGroups(next);
  };

  const addItem = () => {
    if (groups.length === 0) {
      commitGroups([{ title: null, items: ["New package"] }]);
    } else {
      const next = groups.map((g, i) => i === 0 ? { ...g, items: [...g.items, "New package"] } : g);
      commitGroups(next);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-5">
      <Link to={backUrl} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#C9A227] mb-1 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to chatting space
      </Link>

      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-[#C9A227]/15 border border-[#C9A227]/25 flex items-center justify-center text-xl font-bold text-[#C9A227] flex-shrink-0">
          {customer.full_name?.[0]?.toUpperCase() || "?"}
        </div>
        <h1 className="text-xl font-bold text-slate-100 truncate">{customer.full_name}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Content assigned — takes 2/3 width, shown as small widget tiles */}
        <div className="lg:col-span-2 bg-[#1e1e1e] border border-white/8 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Content assigned</p>
            <button onClick={addItem} className="flex items-center gap-1 text-xs text-[#C9A227] hover:text-[#e8c84a] bg-[#C9A227]/10 hover:bg-[#C9A227]/15 border border-[#C9A227]/25 rounded-lg px-2 py-1 transition-all">
              <Plus className="w-3 h-3" /> Add package
            </button>
          </div>

          {groups.length === 0 ? (
            <p className="text-sm text-slate-600">No content assigned yet</p>
          ) : (
            <div className="space-y-4">
              {groups.map((g, gi) => (
                <div key={gi}>
                  {g.title && <p className="text-xs font-semibold text-[#C9A227] mb-2 uppercase tracking-wide">{g.title}</p>}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {g.items.map((item, ii) => (
                      <PackageTile
                        key={ii}
                        item={item}
                        onSave={(val) => updateItem(gi, ii, val)}
                        onDelete={() => deleteItem(gi, ii)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar — contact info + payments */}
        <div className="space-y-5">
          <div className="bg-[#1e1e1e] border border-white/8 rounded-xl p-5 space-y-4">
            <div>
              <p className="text-xs text-slate-500 mb-1.5 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone</p>
              <div className="flex items-center border border-white/8 focus-within:border-[#C9A227]/50 rounded-lg transition-colors">
                <select
                  value={phoneCode}
                  onChange={(e) => {
                    setPhoneCode(e.target.value);
                    onUpdate({ phone: e.target.value + phoneLocal });
                  }}
                  className="bg-transparent text-sm text-slate-400 outline-none py-2.5 pl-2.5 pr-1 cursor-pointer">
                  <option value="+420">🇨🇿 +420</option>
                  <option value="+421">🇸🇰 +421</option>
                </select>
                <input
                  type="text"
                  value={phoneLocal}
                  onChange={(e) => setPhoneLocal(e.target.value)}
                  onBlur={(e) => onUpdate({ phone: phoneCode + e.target.value.replace(/\s/g, "") })}
                  placeholder="Phone number"
                  className="flex-1 bg-transparent outline-none text-sm text-slate-300 placeholder-slate-600 py-2.5 pr-2.5" />
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1.5 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Pay day</p>
              <input
                type="number"
                min="1"
                max="31"
                defaultValue={customer.pay_day_of_month || ""}
                onBlur={(e) => {
                  const val = e.target.value ? parseInt(e.target.value) : null;
                  if (val !== customer.pay_day_of_month) onUpdate({ pay_day_of_month: val });
                }}
                placeholder="Day (1–31)"
                className="w-full bg-white/5 border border-white/8 focus:border-[#C9A227]/50 outline-none text-sm text-slate-300 placeholder-slate-600 rounded-lg p-2.5 transition-colors" />
            </div>
          </div>

          <div className="bg-[#1e1e1e] border border-white/8 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-500">Payments</p>
              <p className="text-sm font-semibold text-slate-200">{totalSpent.toLocaleString()} Kč</p>
            </div>
            {payments.length === 0 ? (
              <p className="text-sm text-slate-600 text-center py-6">No payments yet</p>
            ) : (
              <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/[0.03]">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-200">{(p.amount || 0).toLocaleString()} Kč</p>
                      <p className="text-xs text-slate-500 truncate">{p.payment_date ? format(new Date(p.payment_date), "d. M. yyyy") : ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}