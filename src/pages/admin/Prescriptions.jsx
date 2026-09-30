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
  { title: "Prescriptions — SHARKS Clinic" },
  { name: "description", content: "Review medication issued by SHARKS Clinic doctors and refill status." },
  { name: "robots", content: "noindex" },
];
const SEARCH_KEYS = ["patientName", "medication", "doctor", "id", "dosage"];
const STATUSES = ["Active", "Refill due", "Stopped"];
const FIELDS = [
  { name: "patientName", label: "Patient", required: true },
  { name: "medication", label: "Medication", required: true, placeholder: "Amoxicillin" },
  { name: "dosage", label: "Dosage", required: true, full: true, placeholder: "500mg, 3x daily, 7 days" },
  { name: "doctor", label: "Prescribed by", type: "select", required: true },
  { name: "issued", label: "Issued", type: "date", required: true },
  { name: "status", label: "Status", type: "select", options: STATUSES, required: true },
];
export default function PrescriptionsPage() {
  usePageMeta(pageMeta);
  const { rows, add, update, remove } = useCollection("prescriptions");
  const doctors = useCollection("doctors");
  const fields = FIELDS.map((field) => field.name === "doctor" ? { ...field, options: doctors.rows.map((doctor) => doctor.name) } : field);
  const table = useTable(rows, { searchKeys: SEARCH_KEYS, filterKey: "status", filterOptions: STATUSES, pageSize: 8 });
  const [editing, setEditing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  function save(values) {
    if (editing === "new") {
      add({ id: nextId("prescriptions"), ...values });
      showToast("Prescription added.");
    }
    else if (editing) {
      update(editing.id, values);
      showToast("Prescription updated.");
    }
    setEditing(null);
  }
  const columns = [
    { key: "id", label: "ID", width: "104px" },
    {
      key: "patientName",
      label: "Patient",
      sortable: true,
      render: (row) => (<span className="cell-stack">
     <strong>{row.patientName}</strong>
     <small>{row.doctor}</small>
    </span>),
    },
    { key: "medication", label: "Medication", sortable: true },
    { key: "dosage", label: "Dosage" },
    { key: "issued", label: "Issued", sortable: true, width: "120px" },
    { key: "status", label: "Status", width: "140px", render: (row) => <StatusPill value={row.status}/> },
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
    <p className="page-copy">Medication issued to patients, with refill status kept up to date by the pharmacy desk.</p>
    <button type="button" className="button button-accent" onClick={() => setEditing("new")}>
     <Plus size={16}/> New prescription
    </button>
   </div>

   <DataTable columns={columns} table={table} emptyText="No prescriptions issued." toolbar={<FilterSelect label="Status" value={table.state.filter} options={STATUSES} onChange={table.setFilter}/>}/>

   <Modal open={editing !== null} title={editing === "new" ? "New prescription" : `Edit ${editing?.id ?? "prescription"}`} onClose={() => setEditing(null)}>
    <RecordForm fields={fields} initial={editing === "new" || editing === null ? undefined : editing} submitLabel={editing === "new" ? "Add prescription" : "Save changes"} onSubmit={save} onCancel={() => setEditing(null)}/>
   </Modal>

   <ConfirmDialog open={confirmId !== null} title="Delete prescription" description="This removes the prescription record from this browser." onCancel={() => setConfirmId(null)} onConfirm={() => {
      if (confirmId)
        remove(confirmId);
      setConfirmId(null);
      showToast("Prescription deleted.", "info");
    }}/>
  </div>);
}
