import { usePageMeta } from "@/lib/use-page-meta";
import { Plus } from "lucide-react";
import { useState } from "react";
import { DataTable, FilterSelect, useTable } from "@/components/admin/DataTable";
import { ConfirmDialog, Modal } from "@/components/admin/Modal";
import { RecordForm } from "@/components/admin/RecordForm";
import { RowActions } from "@/components/admin/Blocks";
import { StatusPill } from "@/components/admin/StatusPill";
import { showToast } from "@/lib/toast";
import { usePatients } from "@/lib/use-patients";

const pageMeta = [
  { title: "Patients \u2014 SHARKS Clinic" },
  { name: "description", content: "Manage SHARKS Clinic patient records." },
  { name: "robots", content: "noindex" },
];

const SEARCH_KEYS = ["name", "phone", "email", "code"];
const STATUSES = ["Active", "Inactive"];
const GENDERS = ["Female", "Male", "Other"];
const COLUMNS = [
  { key: "code", label: "ID", width: "96px" },
  { key: "name", label: "Patient", sortable: true },
  { key: "phone", label: "Phone" },
  { key: "age", label: "Age", align: "end", width: "72px", sortable: true },
  {
    key: "status",
    label: "Status",
    width: "140px",
    render: (row) => <StatusPill value={row.status} />,
  },
];
const FIELDS = [
  { name: "name", label: "Full name", required: true, full: true, placeholder: "Patient name" },
  { name: "phone", label: "Phone", type: "tel", required: true, placeholder: "07xx xxx xxx" },
  { name: "email", label: "Email", type: "email", placeholder: "name@example.com" },
  { name: "dateOfBirth", label: "Date of birth", type: "date" },
  { name: "gender", label: "Gender", type: "select", options: GENDERS },
  { name: "address", label: "Address", full: true, placeholder: "Optional" },
];

export default function PatientsPage() {
  usePageMeta(pageMeta);
  const { rows, loading, error, create, save, setActive } = usePatients();
  const table = useTable(rows, {
    searchKeys: SEARCH_KEYS,
    filterKey: "status",
    filterOptions: STATUSES,
    pageSize: 8,
  });
  const [editing, setEditing] = useState(null);
  const [confirmRow, setConfirmRow] = useState(null);
  const [busy, setBusy] = useState(false);

  async function saveForm(values) {
    if (busy) return;
    setBusy(true);
    try {
      if (editing === "new") {
        await create(values);
        showToast("Patient record added.");
      } else if (editing) {
        const changed = await save(editing, values);
        showToast(
          changed ? "Patient record updated." : "No changes to save.",
          changed ? "success" : "info",
        );
      }
      setEditing(null);
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive() {
    const row = confirmRow;
    setConfirmRow(null);
    if (!row) return;
    const makeActive = row.status !== "Active";
    try {
      await setActive(row.id, makeActive);
      showToast(makeActive ? "Patient reactivated." : "Patient deactivated.", "info");
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  const columns = [
    ...COLUMNS,
    {
      key: "actions",
      label: "",
      width: "92px",
      align: "end",
      render: (row) => (
        <RowActions onEdit={() => setEditing(row)} onDelete={() => setConfirmRow(row)} />
      ),
    },
  ];
  const deactivating = confirmRow?.status === "Active";

  return (
    <div className="admin-page">
      <div className="page-actions">
        <p className="page-copy">
          Patient records for the clinic. Records are never deleted, only deactivated, so the
          history is kept.
        </p>
        <button type="button" className="button button-accent" onClick={() => setEditing("new")}>
          <Plus size={16} /> New patient
        </button>
      </div>

      {error && <p className="login-error">{error}</p>}

      <DataTable
        columns={columns}
        table={table}
        emptyText={loading ? "Loading patients..." : "No patients yet."}
        toolbar={
          <FilterSelect
            label="Status"
            value={table.state.filter}
            options={STATUSES}
            onChange={table.setFilter}
          />
        }
      />

      <Modal
        open={editing !== null}
        title={editing === "new" ? "New patient record" : `Edit ${editing?.name ?? "patient"}`}
        onClose={() => setEditing(null)}
      >
        <RecordForm
          fields={FIELDS}
          initial={editing === "new" || editing === null ? undefined : editing}
          submitLabel={editing === "new" ? "Add patient" : "Save changes"}
          onSubmit={saveForm}
          onCancel={() => setEditing(null)}
        />
      </Modal>

      <ConfirmDialog
        open={confirmRow !== null}
        title={deactivating ? "Deactivate patient" : "Reactivate patient"}
        description={
          deactivating
            ? "The record and its history are kept. You can reactivate this patient later."
            : "The patient will appear in the active list again."
        }
        confirmLabel={deactivating ? "Deactivate" : "Reactivate"}
        onCancel={() => setConfirmRow(null)}
        onConfirm={toggleActive}
      />
    </div>
  );
}
