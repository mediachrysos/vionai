import React, { useState } from "react";
import { ArrowLeft, Phone, CalendarDays, CreditCard, FileText, Pencil, Check, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

function parseContent(text) {
  const lines = (text || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const groups = [];
  let current = null;
  for (const line of lines) {
    const headerMatch = line.match(/^(.+?):\s*$/) || (!line.includes(":") ? null : line.match(/^([^:]{2,40}):\s*(.*)$/));
    if (line.endsWith(":")) {
      current = { title: line.slice(0, -1), items: [] };
      groups.push(current);
    } else if (headerMatch && headerMatch[2] === "" ) {
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

export default function ChattingCustomerCard({ customer, payments, onUpdate }) {
  const [editingContent, setEditingContent] = useState(false);
  const [contentDraft, setContentDraft] = useState(customer.sent_content || "");
  const totalSpent = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const groups = parseContent(customer.sent_content);

  const handleBlur = (field, value) => {
    if (customer[field] !== value) onUpdate({ [field]: value });
  };

  const saveContent = () => {
    setEditingContent(false);
    if (contentDraft !== (customer.sent_content || "")) onUpdate({ sent_content: contentDraft });
  };

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-5">
      <Link to={createPageUrl("Customers")} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#C9A227] mb-1 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to customers
      </Link>

      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-[#C9A227]/15 border border-[#C9A227]/25 flex items-center justify-center text-xl font-bold text-[#C9A227] flex-shrink-0">
          {customer.full_name?.[0]?.toUpperCase() || "?"}
        </div>
        <h1 className="text-xl font-bold text-slate-100 truncate">{customer.full_name}</h1>
      </div>

      {/* Content assigned */}
      <div className="bg-[#1e1e1e] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-slate-500 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Content assigned</p>
          {editingContent ? (
            <button onClick={saveContent} className="text-slate-500 hover:text-[#C9A227] p-1"><Check className="w-3.5 h-3.5" /></button>
          ) : (
            <button onClick={() => { setContentDraft(customer.sent_content || ""); setEditingContent(true); }} className="text-slate-500 hover:text-[#C9A227] p-1"><Pencil className="w-3.5 h-3.5" /></button>
          )}
        </div>

        {editingContent ? (
          <textarea
            autoFocus
            value={contentDraft}
            onChange={(e) => setContentDraft(e.target.value)}
            onBlur={saveContent}
            placeholder={"Model name:\nPack 3 - Sucking a dildo\nPack 4 - Dildo"}
            rows={6}
            className="w-full bg-white/5 border border-white/8 focus:border-[#C9A227]/50 outline-none text-sm text-slate-300 placeholder-slate-600 rounded-lg p-2.5 resize-none transition-colors" />
        ) : groups.length === 0 ? (
          <p className="text-sm text-slate-600">No content assigned yet</p>
        ) : (
          <div className="space-y-3">
            {groups.map((g, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
                {g.title && <p className="text-sm font-semibold text-[#C9A227] mb-1.5">{g.title}</p>}
                <div className="space-y-1">
                  {g.items.map((item, j) => (
                    <div key={j} className="flex items-start gap-2">
                      <Package className="w-3.5 h-3.5 text-slate-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-slate-300">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Contact info */}
      <div className="bg-[#1e1e1e] border border-white/8 rounded-xl p-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-500 mb-1.5 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone</p>
          <input
            type="text"
            defaultValue={customer.phone || ""}
            onBlur={(e) => handleBlur("phone", e.target.value)}
            placeholder="Phone number"
            className="w-full bg-white/5 border border-white/8 focus:border-[#C9A227]/50 outline-none text-sm text-slate-300 placeholder-slate-600 rounded-lg p-2.5 transition-colors" />
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
              handleBlur("pay_day_of_month", val);
            }}
            placeholder="Day (1–31)"
            className="w-full bg-white/5 border border-white/8 focus:border-[#C9A227]/50 outline-none text-sm text-slate-300 placeholder-slate-600 rounded-lg p-2.5 transition-colors" />
        </div>
      </div>

      {/* Payments breakdown */}
      <div className="bg-[#1e1e1e] border border-white/8 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-slate-500">Payments</p>
          <p className="text-sm font-semibold text-slate-200">{totalSpent.toLocaleString()} Kč total</p>
        </div>
        {payments.length === 0 ? (
          <p className="text-sm text-slate-600 text-center py-6">No payments yet</p>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
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
  );
}