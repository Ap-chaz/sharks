import { usePageMeta } from "@/lib/use-page-meta";
import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { DataTable, FilterSelect, useTable } from "@/components/admin/DataTable";
import { ConfirmDialog, Modal } from "@/components/admin/Modal";
import { RecordForm } from "@/components/admin/RecordForm";
import { RowActions } from "@/components/admin/Blocks";
import { StatusPill } from "@/components/admin/StatusPill";
import { nextId } from "@/lib/clinic-db";
import { showToast } from "@/lib/toast";
import { useCollection } from "@/lib/use-clinic-data";
const pageMeta = [
  { title: "Appointments — SHARKS Clinic" },
  { name: "description", content: "Review and confirm SHARKS Clinic appointment requests." },
  { name: "robots", content: "noindex" },
];
const SEARCH_KEYS = ["patientName", "phone", "department", "doctor", "id", "reason"];
const STATUSES = ["Pending", "Confirmed", "Completed", "Cancelled"];
const DEPARTMENTS = [
  "General Consultation",
  "Cardiology",
  "Emergency Care",
  "Pediatrics",
  "Dental Care",
  "Orthopedics",
  "Laboratory",
  "Dermatology",
];
const FIELDS = [
  { name: "patientName", label: "Patient name", required: true },
  { name: "phone", label: "Phone", type: "tel", required: true },
  { name: "email", label: "Email", type: "email" },
  { name: "doctor", label: "Doctor", type: "select", required: true },
  { name: "department", label: "Department", type: "select", options: DEPARTMENTS, required: true },
  { name: "date", label: "Date", type: "date", required: true },
  { name: "time", label: "Time", required: true, placeholder: "09:00 AM" },
  { name: "status", label: "Status", type: "select", options: STATUSES, required: true },
  { name: "reason", label: "Reason for visit", type: "textarea", required: true, full: true },
];
export default function AppointmentsPage() {
  usePageMeta(pageMeta);
  const { rows, add, update, remove } = useCollection("appointments");
  const doctors = useCollection("doctors");
  const doctorOptions = ["To be assigned", ...doctors.rows.map((doctor) => doctor.name)];
  const fields = FIELDS.map((field) => field.name === "doctor" ? { ...field, options: doctorOptions } : field);
  const table = useTable(rows, { searchKeys: SEARCH_KEYS, filterKey: "status", filterOptions: STATUSES, pageSize: 8 });
  const [editing, setEditing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  function save(values) {
    if (editing === "new") {
      add({ id: nextId("appointments"), source: "staff", ...values });
      showToast("Appointment added.");
    }
    else if (editing) {
      update(editing.id, values);
      showToast("Appointment updated.");
    }
    setEditing(null);
  }
  const columns = [
    { key: "id", label: "ID", width: "96px" },
    {
      key: "patientName",
      label: "Patient",
      sortable: true,
      render: (row) => (<span className="cell-stack">
     <strong>{row.patientName}</strong>
     <small>{row.phone}</small>
    </span>),
    },
    { key: "department", label: "Department", sortable: true },
    { key: "doctor", label: "Doctor" },
    {
      key: "date",
      label: "When",
      sortable: true,
      width: "150px",
      render: (row) => (<span className="cell-stack">
     <strong>{row.date}</strong>
     <small>{row.time}</small>
    </span>),
    },
    { key: "status", label: "Status", width: "140px", render: (row) => <StatusPill value={row.status}/> },
    {
      key: "source",
      label: "Source",
      width: "110px",
      render: (row) => <span className="badge">{row.source === "website" ? "Website" : row.source === "staff" ? "Staff" : "Seed"}</span>,
    },
    {
      key: "actions",
      label: "",
      width: "130px",
      align: "end",
      render: (row) => (<span className="cell-actions">
     {row.status === "Pending" && (<button type="button" className="row-confirm" onClick={() => {
            update(row.id, { status: "Confirmed" });
            showToast(`Appointment ${row.id} confirmed.`);
          }}>
       <Check size={14}/> Confirm
      </button>)}
     <RowActions onEdit={() => setEditing(row)} onDelete={() => setConfirmId(row.id)}/>
    </span>),
    },
  ];
  return (<div className="admin-page">
   <div className="page-actions">
    <p className="page-copy">
     Requests from the public booking form arrive here as <strong>Pending</strong>. Confirm, reassign a doctor, or
     cancel as needed.
    </p>
    <button type="button" className="button button-accent" onClick={() => setEditing("new")}>
     <Plus size={16}/> New appointment
    </button>
   </div>

   <DataTable columns={columns} table={table} emptyText="No appointments booked." toolbar={<FilterSelect label="Status" value={table.state.filter} options={STATUSES} onChange={table.setFilter}/>}/>

   <Modal open={editing !== null} title={editing === "new" ? "New appointment" : `Edit ${editing?.id ?? "appointment"}`} onClose={() => setEditing(null)}>
    <RecordForm fields={fields} initial={editing === "new" || editing === null ? undefined : editing} submitLabel={editing === "new" ? "Add appointment" : "Save changes"} onSubmit={save} onCancel={() => setEditing(null)}/>
   </Modal>

   <ConfirmDialog open={confirmId !== null} title="Delete appointment" description="This removes the booking from the clinic records in this browser." onCancel={() => setConfirmId(null)} onConfirm={() => {
      if (confirmId)
        remove(confirmId);
      setConfirmId(null);
      showToast("Appointment deleted.", "info");
    }}/>
  </div>);
}
