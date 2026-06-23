import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, X, CreditCard, Building2, Bot, ChevronLeft, ChevronRight } from "lucide-react";
import DatePicker from "@/components/ui-custom/DatePicker";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

const emptyForm = () => ({
  customer_name: "",
  note_date: new Date().toISOString().split("T")[0],
  amount: "",
  account: "",
  account_name: "",
  model_id: "",
  model_name: "",
  content: ""
});

// Slide fields (in order, after content)
const SLIDES = ["customer", "datetime_amount", "account", "model"];

const slideLabel = { customer: "Klient", datetime_amount: "Datum & Částka", account: "Účet", model: "Modelka" };

export default function TodayNotesWidget({ currentUser, paydayCustomers = [], models: paydayModels = [] }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [noteSearch, setNoteSearch] = useState("");
  const [slideIdx, setSlideIdx] = useState(0); // which extra field is showing
  const [noteIdx, setNoteIdx] = useState(0); // which note is showing in carousel

  const { data: notes = [] } = useQuery({
    queryKey: ["notes"],
    queryFn: () => base44.entities.Note.list("-created_date", 100)
  });
  const { data: models = [] } = useQuery({
    queryKey: ["models"],
    queryFn: () => base44.entities.Model.list()
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 500)
  });
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankAccounts"],
    queryFn: () => base44.entities.BankAccount.filter({ is_active: true })
  });

  const isAdmin = currentUser?.role === "admin";

  const myModelIds = useMemo(() => {
    if (!currentUser?.email || isAdmin) return null;
    return models.filter((m) => m.assigned_chatters?.includes(currentUser.email)).map((m) => m.id);
  }, [models, currentUser, isAdmin]);

  const visibleNotes = useMemo(() => {
    if (isAdmin) return notes;
    return notes.filter((n) => {
      if (!n.model_id) return n.author_email === currentUser?.email;
      return myModelIds?.includes(n.model_id);
    });
  }, [notes, isAdmin, myModelIds, currentUser]);

  const sortedNotes = useMemo(() => {
    const filtered = noteSearch ?
    visibleNotes.filter((n) =>
    n.customer_name?.toLowerCase().includes(noteSearch.toLowerCase()) ||
    n.model_name?.toLowerCase().includes(noteSearch.toLowerCase()) ||
    n.content?.toLowerCase().includes(noteSearch.toLowerCase())
    ) :
    visibleNotes;
    return [...filtered].sort((a, b) => {
      const aToday = a.note_date === today;
      const bToday = b.note_date === today;
      if (aToday && !bToday) return -1;
      if (!aToday && bToday) return 1;
      return new Date(b.created_date) - new Date(a.created_date);
    });
  }, [visibleNotes, today, noteSearch]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 8);
    return customers.filter((c) =>
    c.full_name?.toLowerCase().includes(customerSearch.toLowerCase())
    ).slice(0, 8);
  }, [customers, customerSearch]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Note.create({
      ...data,
      amount: data.amount ? parseFloat(data.amount) : undefined,
      author_email: currentUser?.email,
      author_name: currentUser?.full_name
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      setShowForm(false);
      setForm(emptyForm());
      setCustomerSearch("");
      setSlideIdx(0);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Note.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] })
  });

  const handleModelChange = (id) => {
    const m = models.find((m) => m.id === id);
    setForm((p) => ({ ...p, model_id: id, model_name: m?.name || "" }));
  };

  const handleAccountChange = (id) => {
    if (id === "__manual__") {
      setForm((p) => ({ ...p, account: "", account_name: "" }));
      return;
    }
    const acc = bankAccounts.find((a) => a.id === id);
    setForm((p) => ({ ...p, account: id, account_name: acc?.name || "" }));
  };

  const selectCustomer = (name) => {
    setForm((p) => ({ ...p, customer_name: name }));
    setCustomerSearch(name);
    setShowCustomerDropdown(false);
  };

  const prevSlide = () => setSlideIdx((i) => (i - 1 + SLIDES.length) % SLIDES.length);
  const nextSlide = () => setSlideIdx((i) => (i + 1) % SLIDES.length);

  const prevNote = () => setNoteIdx((i) => Math.max(0, i - 1));
  const nextNote = () => setNoteIdx((i) => Math.min(sortedNotes.length - 1, i + 1));

  const currentSlide = SLIDES[slideIdx];

  return null;














































































































































































































































































}