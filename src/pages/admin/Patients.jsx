import { usePageMeta } from "@/lib/use-page-meta";
import { Plus } from "lucide-react";
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
  { title: "Patients — SHARKS Clinic" },
  { name: "description", content: "Manage SHARKS Clinic patient records." },
  { name: "robots", content: "noindex" },
];
const SEARCH_KEYS = ["name", "phone", "email", "id"];
const STATUSES = ["Active", "New", "Critical", "Discharged"];
const GENDERS = ["Female", "Male"];
const COLUMNS = [
  { key: "id", label: "ID", width: "96px" },
  { key: "name", label: "Patient", sortable: true },
  { key: "phone", label: "Phone" },
  { key: "age", label: "Age", align: "end", width: "72px", sortable: true },
  { key: "lastVisit", label: "Last visit", sortable: true, width: "120px" },
  { key: "status", label: "Status", width: "140px", render: (row) => <StatusPill value={row.status}/> },
];
const FIELDS = [
  { name: "name", label: "Full name", required: true, full: true, placeholder: "Patient name" },
  { name: "phone", label: "Phone", type: "tel", required: true, placeholder: "07xx xxx xxx" },
  { name: "email", label: "Email", type: "email", placeholder: "name@example.com" },
  { name: "age", label: "Age", type: "number", required: true },
  { name: "gender", label: "Gender", type: "select", options: GENDERS, required: true },
  { name: "lastVisit", label: "Last visit", type: "date", required: true },
  { name: "status", label: "Status", type: "select", options: STATUSES, required: true },
];
export default function PatientsPage() {
  usePageMeta(pageMeta);
  const { rows, add, update, remove } = useCollection("patients");
  const table = useTable(rows, { searchKeys: SEARCH_KEYS, filterKey: "status", filterOptions: STATUSES, pageSize: 8 });
  const [editing, setEditing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  function save(values) {
    if (editing === "new") {
      add({ id: nextId("patients"), ...values });
      showToast("Patient record added.");
    }
    else if (editing) {
      update(editing.id, values);
      showToast("Patient record updated.");
    }
    setEditing(null);
  }
  const columns = [
    ...COLUMNS,
    {
      key: "actions",
      label: "",
      width: "92px",
      align: "end",
      render: (row) => (<RowActions onEdit={() => setEditing(row)} onDelete={() => setConfirmId(row.id)}/>),
    },
  ];
  return (<div className="admin-page">
   <div className="page-actions">
    <p className="page-copy">
     Patient records shared with the appointment form. New bookings from the public site appear here automatically.
    </p>
    <button type="button" className="button button-accent" onClick={() => setEditing("new")}>
     <Plus size={16}/> New patient
    </button>
   </div>

   <DataTable columns={columns} table={table} emptyText="No patients yet." toolbar={<FilterSelect label="Status" value={table.state.filter} options={STATUSES} onChange={table.setFilter}/>}/>

   <Modal open={editing !== null} title={editing === "new" ? "New patient record" : `Edit ${editing?.name ?? "patient"}`} onClose={() => setEditing(null)}>
    <RecordForm fields={FIELDS} initial={editing === "new" || editing === null ? undefined : editing} submitLabel={editing === "new" ? "Add patient" : "Save changes"} onSubmit={save} onCancel={() => setEditing(null)}/>
   </Modal>

   <ConfirmDialog open={confirmId !== null} title="Delete patient record" description="This removes the patient from this browser’s records. Appointments already booked stay in place." onCancel={() => setConfirmId(null)} onConfirm={() => {
      if (confirmId)
        remove(confirmId);
      setConfirmId(null);
      showToast("Patient record deleted.", "info");
    }}/>
  </div>);
}
