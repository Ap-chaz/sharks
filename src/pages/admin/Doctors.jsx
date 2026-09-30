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
  { title: "Doctors — SHARKS Clinic" },
  { name: "description", content: "Manage the SHARKS Clinic clinical team and their availability." },
  { name: "robots", content: "noindex" },
];
const SEARCH_KEYS = ["name", "specialty", "email", "phone"];
const STATUSES = ["On Duty", "On Call", "Off Duty"];
const COLUMNS = [
  { key: "id", label: "ID", width: "86px" },
  { key: "name", label: "Doctor", sortable: true },
  { key: "specialty", label: "Specialty", sortable: true },
  { key: "phone", label: "Phone", width: "150px" },
  { key: "email", label: "Email" },
  { key: "status", label: "Availability", width: "150px", render: (row) => <StatusPill value={row.status}/> },
];
const FIELDS = [
  { name: "name", label: "Full name", required: true, full: true, placeholder: "Dr. Jane Smith" },
  { name: "specialty", label: "Specialty", required: true, placeholder: "General Medicine" },
  { name: "phone", label: "Phone", type: "tel", required: true, placeholder: "07xx xxx xxx" },
  { name: "email", label: "Email", type: "email", required: true, full: true },
  { name: "status", label: "Availability", type: "select", options: STATUSES, required: true },
];
export default function DoctorsPage() {
  usePageMeta(pageMeta);
  const { rows, add, update, remove } = useCollection("doctors");
  const table = useTable(rows, { searchKeys: SEARCH_KEYS, filterKey: "status", filterOptions: STATUSES, pageSize: 8 });
  const [editing, setEditing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  function save(values) {
    if (editing === "new") {
      add({ id: nextId("doctors"), ...values });
      showToast("Doctor added to the clinical team.");
    }
    else if (editing) {
      update(editing.id, values);
      showToast("Doctor details updated.");
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
      render: (row) => <RowActions onEdit={() => setEditing(row)} onDelete={() => setConfirmId(row.id)}/>,
    },
  ];
  return (<div className="admin-page">
   <div className="page-actions">
    <p className="page-copy">Doctors listed here can be assigned to appointments from the dashboard.</p>
    <button type="button" className="button button-accent" onClick={() => setEditing("new")}>
     <Plus size={16}/> Add doctor
    </button>
   </div>

   <DataTable columns={columns} table={table} emptyText="No doctors added." toolbar={<FilterSelect label="Availability" value={table.state.filter} options={STATUSES} onChange={table.setFilter}/>}/>

   <Modal open={editing !== null} title={editing === "new" ? "Add doctor" : `Edit ${editing?.name ?? "doctor"}`} onClose={() => setEditing(null)}>
    <RecordForm fields={FIELDS} initial={editing === "new" || editing === null ? undefined : editing} submitLabel={editing === "new" ? "Add doctor" : "Save changes"} onSubmit={save} onCancel={() => setEditing(null)}/>
   </Modal>

   <ConfirmDialog open={confirmId !== null} title="Remove doctor" description="This removes the doctor from the team list in this browser. Appointments already assigned to them stay in place." confirmLabel="Remove" onCancel={() => setConfirmId(null)} onConfirm={() => {
      if (confirmId)
        remove(confirmId);
      setConfirmId(null);
      showToast("Doctor removed.", "info");
    }}/>
  </div>);
}
