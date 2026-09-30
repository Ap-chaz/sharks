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
  { title: "Staff management — SHARKS Clinic" },
  { name: "description", content: "Manage SHARKS Clinic staff accounts and their roles." },
  { name: "robots", content: "noindex" },
];
const SEARCH_KEYS = ["name", "role", "email", "phone"];
const ROLES = ["Administrator", "Receptionist", "Nurse", "Lab Technician", "Pharmacist", "Accountant"];
const STATUSES = ["Active", "Suspended"];
const FIELDS = [
  { name: "name", label: "Full name", required: true, full: true },
  { name: "role", label: "Role", type: "select", options: ROLES, required: true },
  { name: "status", label: "Access", type: "select", options: STATUSES, required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "phone", label: "Phone", type: "tel", required: true },
];
export default function StaffPage() {
  usePageMeta(pageMeta);
  const { rows, add, update, remove } = useCollection("staff");
  const table = useTable(rows, { searchKeys: SEARCH_KEYS, filterKey: "status", filterOptions: STATUSES, pageSize: 8 });
  const [editing, setEditing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  function save(values) {
    if (editing === "new") {
      add({ id: nextId("staff"), ...values });
      showToast("Staff account added.");
    }
    else if (editing) {
      update(editing.id, values);
      showToast("Staff account updated.");
    }
    setEditing(null);
  }
  const columns = [
    { key: "id", label: "ID", width: "86px" },
    {
      key: "name",
      label: "Staff member",
      sortable: true,
      render: (row) => (<span className="cell-stack">
     <strong>{row.name}</strong>
     <small>{row.email}</small>
    </span>),
    },
    { key: "role", label: "Role", sortable: true, width: "170px" },
    { key: "phone", label: "Phone", width: "150px" },
    { key: "status", label: "Access", width: "140px", render: (row) => <StatusPill value={row.status}/> },
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
    <p className="page-copy">
     Staff accounts are recorded here for the clinic roster. Every account currently shares the single demo sign
     in — roles are not enforced yet.
    </p>
    <button type="button" className="button button-accent" onClick={() => setEditing("new")}>
     <Plus size={16}/> Add staff
    </button>
   </div>

   <DataTable columns={columns} table={table} emptyText="No staff accounts." toolbar={<FilterSelect label="Access" value={table.state.filter} options={STATUSES} onChange={table.setFilter}/>}/>

   <Modal open={editing !== null} title={editing === "new" ? "Add staff account" : `Edit ${editing?.name ?? "staff"}`} onClose={() => setEditing(null)}>
    <RecordForm fields={FIELDS} initial={editing === "new" || editing === null ? undefined : editing} submitLabel={editing === "new" ? "Add account" : "Save changes"} onSubmit={save} onCancel={() => setEditing(null)}/>
   </Modal>

   <ConfirmDialog open={confirmId !== null} title="Remove staff account" description="This removes the account from the clinic roster in this browser." confirmLabel="Remove" onCancel={() => setConfirmId(null)} onConfirm={() => {
      if (confirmId)
        remove(confirmId);
      setConfirmId(null);
      showToast("Staff account removed.", "info");
    }}/>
  </div>);
}
