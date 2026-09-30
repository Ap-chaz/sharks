import { usePageMeta } from "@/lib/use-page-meta";
import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { DataTable, FilterSelect, useTable } from "@/components/admin/DataTable";
import { ConfirmDialog, Modal } from "@/components/admin/Modal";
import { RecordForm } from "@/components/admin/RecordForm";
import { Money, RowActions, StatCard } from "@/components/admin/Blocks";
import { StatusPill } from "@/components/admin/StatusPill";
import { nextId } from "@/lib/clinic-db";
import { showToast } from "@/lib/toast";
import { useCollection, useSettings } from "@/lib/use-clinic-data";
const pageMeta = [
  { title: "Billing — SHARKS Clinic" },
  { name: "description", content: "Track SHARKS Clinic invoices, payments and outstanding balances." },
  { name: "robots", content: "noindex" },
];
const SEARCH_KEYS = ["patientName", "service", "id", "method"];
const STATUSES = ["Paid", "Pending", "Overdue"];
const METHODS = ["M-Pesa", "Card", "Cash", "Insurance"];
const SERVICES = [
  "General Consultation",
  "Cardiology",
  "Emergency Care",
  "Pediatrics",
  "Dental Care",
  "Orthopedics",
  "Laboratory Services",
  "Dermatology",
];
const FIELDS = [
  { name: "patientName", label: "Patient", required: true },
  { name: "service", label: "Service", type: "select", options: SERVICES, required: true },
  { name: "amount", label: "Amount", type: "number", required: true },
  { name: "date", label: "Date", type: "date", required: true },
  { name: "method", label: "Payment method", type: "select", options: METHODS, required: true },
  { name: "status", label: "Status", type: "select", options: STATUSES, required: true },
];
export default function BillingPage() {
  usePageMeta(pageMeta);
  const { rows, add, update, remove } = useCollection("invoices");
  const { settings } = useSettings();
  const currency = settings?.currency ?? "KES";
  const table = useTable(rows, { searchKeys: SEARCH_KEYS, filterKey: "status", filterOptions: STATUSES, pageSize: 8 });
  const [editing, setEditing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const total = (predicate) => rows.filter(predicate).reduce((sum, row) => sum + row.amount, 0);
  function save(values) {
    if (editing === "new") {
      add({ id: nextId("invoices"), ...values });
      showToast("Invoice recorded.");
    }
    else if (editing) {
      update(editing.id, values);
      showToast("Invoice updated.");
    }
    setEditing(null);
  }
  const columns = [
    { key: "id", label: "Invoice", width: "110px" },
    {
      key: "patientName",
      label: "Patient",
      sortable: true,
      render: (row) => (<span className="cell-stack">
     <strong>{row.patientName}</strong>
     <small>{row.service}</small>
    </span>),
    },
    { key: "amount", label: "Amount", align: "end", sortable: true, width: "140px", render: (row) => <Money amount={row.amount} currency={currency}/> },
    { key: "date", label: "Date", sortable: true, width: "120px" },
    { key: "method", label: "Method", width: "120px" },
    { key: "status", label: "Status", width: "130px", render: (row) => <StatusPill value={row.status}/> },
    {
      key: "actions",
      label: "",
      width: "130px",
      align: "end",
      render: (row) => (<span className="cell-actions">
     {row.status !== "Paid" && (<button type="button" className="row-confirm" onClick={() => {
            update(row.id, { status: "Paid" });
            showToast(`Invoice ${row.id} marked paid.`);
          }}>
       <Check size={14}/> Mark paid
      </button>)}
     <RowActions onEdit={() => setEditing(row)} onDelete={() => setConfirmId(row.id)}/>
    </span>),
    },
  ];
  return (<div className="admin-page">
   <div className="stat-grid">
    <StatCard label="Collected" value={`${currency} ${total((row) => row.status === "Paid").toLocaleString("en-KE")}`}/>
    <StatCard label="Pending" value={`${currency} ${total((row) => row.status === "Pending").toLocaleString("en-KE")}`}/>
    <StatCard label="Overdue" value={`${currency} ${total((row) => row.status === "Overdue").toLocaleString("en-KE")}`}/>
    <StatCard label="Invoices" value={String(rows.length)} hint="All time"/>
   </div>

   <div className="page-actions">
    <p className="page-copy">Record payments as they come in. Amounts use the currency set in clinic settings.</p>
    <button type="button" className="button button-accent" onClick={() => setEditing("new")}>
     <Plus size={16}/> New invoice
    </button>
   </div>

   <DataTable columns={columns} table={table} emptyText="No invoices recorded." toolbar={<FilterSelect label="Status" value={table.state.filter} options={STATUSES} onChange={table.setFilter}/>}/>

   <Modal open={editing !== null} title={editing === "new" ? "New invoice" : `Edit ${editing?.id ?? "invoice"}`} onClose={() => setEditing(null)}>
    <RecordForm fields={FIELDS} initial={editing === "new" || editing === null ? undefined : editing} submitLabel={editing === "new" ? "Record invoice" : "Save changes"} onSubmit={save} onCancel={() => setEditing(null)}/>
   </Modal>

   <ConfirmDialog open={confirmId !== null} title="Delete invoice" description="This removes the invoice from the billing records in this browser." onCancel={() => setConfirmId(null)} onConfirm={() => {
      if (confirmId)
        remove(confirmId);
      setConfirmId(null);
      showToast("Invoice deleted.", "info");
    }}/>
  </div>);
}
