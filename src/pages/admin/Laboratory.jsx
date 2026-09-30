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
  { title: "Laboratory — SHARKS Clinic" },
  { name: "description", content: "Track SHARKS Clinic laboratory tests from sample to reviewed result." },
  { name: "robots", content: "noindex" },
];
const SEARCH_KEYS = ["patientName", "test", "requestedBy", "id"];
const STATUSES = ["Awaiting sample", "In lab", "Ready", "Reviewed"];
const NEXT_STATUS = {
  "Awaiting sample": "In lab",
  "In lab": "Ready",
  Ready: "Reviewed",
};
const FIELDS = [
  { name: "patientName", label: "Patient", required: true },
  { name: "test", label: "Test", required: true, placeholder: "Full blood count" },
  { name: "requestedBy", label: "Requested by", type: "select", required: true },
  { name: "sampleDate", label: "Sample date", type: "date", required: true },
  { name: "status", label: "Status", type: "select", options: STATUSES, required: true },
];
export default function LaboratoryPage() {
  usePageMeta(pageMeta);
  const { rows, add, update, remove } = useCollection("labTests");
  const doctors = useCollection("doctors");
  const fields = FIELDS.map((field) => field.name === "requestedBy" ? { ...field, options: doctors.rows.map((doctor) => doctor.name) } : field);
  const table = useTable(rows, { searchKeys: SEARCH_KEYS, filterKey: "status", filterOptions: STATUSES, pageSize: 8 });
  const [editing, setEditing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  function save(values) {
    if (editing === "new") {
      add({ id: nextId("labTests"), ...values });
      showToast("Lab test added.");
    }
    else if (editing) {
      update(editing.id, values);
      showToast("Lab test updated.");
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
     <small>Requested by {row.requestedBy}</small>
    </span>),
    },
    { key: "test", label: "Test", sortable: true },
    { key: "sampleDate", label: "Sample date", sortable: true, width: "130px" },
    { key: "status", label: "Status", width: "170px", render: (row) => <StatusPill value={row.status}/> },
    {
      key: "actions",
      label: "",
      width: "150px",
      align: "end",
      render: (row) => {
        const next = NEXT_STATUS[row.status];
        return (<span className="cell-actions">
      {next && (<button type="button" className="row-confirm" onClick={() => {
              update(row.id, { status: next });
              showToast(`${row.id} moved to ${next}.`);
            }}>
        <Check size={14}/> {next}
       </button>)}
      <RowActions onEdit={() => setEditing(row)} onDelete={() => setConfirmId(row.id)}/>
     </span>);
      },
    },
  ];
  return (<div className="admin-page">
   <div className="page-actions">
    <p className="page-copy">Each test moves through sample, lab, ready and reviewed. Use the button on a row to advance it.</p>
    <button type="button" className="button button-accent" onClick={() => setEditing("new")}>
     <Plus size={16}/> New test
    </button>
   </div>

   <DataTable columns={columns} table={table} emptyText="No lab tests in progress." toolbar={<FilterSelect label="Status" value={table.state.filter} options={STATUSES} onChange={table.setFilter}/>}/>

   <Modal open={editing !== null} title={editing === "new" ? "New lab test" : `Edit ${editing?.id ?? "test"}`} onClose={() => setEditing(null)}>
    <RecordForm fields={fields} initial={editing === "new" || editing === null ? undefined : editing} submitLabel={editing === "new" ? "Add test" : "Save changes"} onSubmit={save} onCancel={() => setEditing(null)}/>
   </Modal>

   <ConfirmDialog open={confirmId !== null} title="Delete lab test" description="This removes the test request from the laboratory queue in this browser." onCancel={() => setConfirmId(null)} onConfirm={() => {
      if (confirmId)
        remove(confirmId);
      setConfirmId(null);
      showToast("Lab test deleted.", "info");
    }}/>
  </div>);
}
