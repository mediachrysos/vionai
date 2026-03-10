import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, CreditCard, Calendar, Pencil, User, Building } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import PageHeader from "../components/ui-custom/PageHeader";
import CustomerFormModal from "../components/customers/CustomerFormModal";

const statusColors = {
  active: "bg-emerald-50 text-emerald-700", inactive: "bg-slate-50 text-slate-600",
  vip: "bg-amber-50 text-amber-700", blocked: "bg-red-50 text-red-600",
};

export default function CustomerDetail({ currentUser }) {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");
  const [showEdit, setShowEdit] = useState(false);
  const qc = useQueryClient();

  const { data: customer } = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      const list = await base44.entities.Customer.filter({ id });
      return list[0];
    },
    enabled: !!id,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["customer-payments", id],
    queryFn: () => base44.entities.Payment.filter({ customer_id: id }, "-created_date"),
    enabled: !!id,
  });

  const { data: models = [] } = useQuery({ queryKey: ["models"], queryFn: () => base44.entities.Model.list() });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: () => base44.entities.User.list() });
  const { data: allCustomers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => base44.entities.Customer.list() });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["customer", id] }); setShowEdit(false); },
  });

  const modelMap = {};
  models.forEach(m => { modelMap[m.id] = m.name; });

  if (!customer) return <div className="p-8 text-center text-slate-400">Loading...</div>;

  const totalSpent = payments.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      <Link to={createPageUrl("Customers")} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Zpět na zákazníky
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-indigo-50 flex items-center justify-center text-xl font-bold text-indigo-600">
            {customer.full_name?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{customer.full_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={statusColors[customer.status]}>{customer.status}</Badge>
              {customer.email && <span className="text-sm text-slate-400">{customer.email}</span>}
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => setShowEdit(true)}>
          <Pencil className="w-4 h-4 mr-1" /> Edit
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Total Spent</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">${totalSpent.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-1">{payments.length} payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Model</p>
            <p className="text-lg font-semibold text-slate-900 mt-1">{modelMap[customer.assigned_model] || "Not assigned"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-500 uppercase tracking-wider">Chatter</p>
            <p className="text-lg font-semibold text-slate-900 mt-1">{customer.assigned_chatter || "Not assigned"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {customer.email && <div className="flex items-center gap-3 text-sm"><Mail className="w-4 h-4 text-slate-400" /> {customer.email}</div>}
            {customer.bank_name && <div className="flex items-center gap-3 text-sm"><Building className="w-4 h-4 text-slate-400" /> {customer.bank_name} — {customer.bank_account_number}</div>}
            {customer.date_of_birth && <div className="flex items-center gap-3 text-sm"><Calendar className="w-4 h-4 text-slate-400" /> {customer.date_of_birth}</div>}
            {customer.notes && <div className="mt-3 p-3 bg-slate-50 rounded-lg text-sm text-slate-600">{customer.notes}</div>}
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader><CardTitle className="text-base">Payment History</CardTitle></CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">No payments yet</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50">
                    <div>
                      <p className="text-sm font-medium text-slate-700">${(p.amount || 0).toLocaleString()}</p>
                      <p className="text-xs text-slate-400">{p.service_type || "Payment"} · {p.created_date ? format(new Date(p.created_date), "MMM d, yyyy") : "—"}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{p.status || "completed"}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CustomerFormModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        onSave={updateMutation.mutateAsync}
        customer={customer}
        models={models}
        users={users}
        allCustomers={allCustomers}
      />
    </div>
  );
}