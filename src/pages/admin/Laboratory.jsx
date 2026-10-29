import { usePageMeta } from "@/lib/use-page-meta";
import { Check, Plus } from "lucide-react";
import { useState } from "react";
import { DataTable, FilterSelect, useTable } from "@/components/admin/DataTable";
import { ConfirmDialog, Modal } from "@/components/admin/Modal";
import { RecordForm } from "@/components/admin/RecordForm";
import { StatusPill } from "@/components/admin/StatusPill";
import { showToast } from "@/lib/toast";
import { useLab } from "@/lib/use-lab";
import { usePatients } from "@/lib/use-patients";
import { useAdminUser } from "@/lib/admin-user";

const pageMeta = [
  { title: "Laboratory \u2014 SHARKS Clinic" },
  { name: "description", content: "Track SHARKS Clinic laboratory tests from request to result." },
  { name: "robots", content: "noindex" },
];

const SEARCH_KEYS = ["patientName", "test", "code"];
const STATUSES = ["Requested", "In progress", "Completed", "Cancelled"];
const RESULT_FIELDS = [
  {
    name: "resultText",
    label: "Result",
    type: "textarea",
    required: true,
    full: true,
    placeholder: "Result details",
  },
  { name: "unit", label: "Unit", placeholder: "Optional" },
  { name: "referenceRange", label: "Reference range", placeholder: "Optional" },
];

function NewTestForm({ onSubmit, onCancel }) {
  const { rows } = usePatients();
  const active = rows.filter((p) => p.status === "Active");
  const labels = active.map((p) => p.code + " " + p.name);
  const fields = [
    {
      name: "patient",
      label: "Patient",
      type: "select",
      required: true,
      full: true,
      options: labels,
    },
    { name: "test", label: "Test", required: true, full: true, placeholder: "Full blood count" },
    { name: "notes", label: "Notes", type: "textarea", full: true, placeholder: "Optional" },
  ];
  function submit(values) {
    const index = labels.indexOf(values.patient);
    if (index === -1) {
      showToast("Choose a patient.", "error");
      return;
    }
    return onSubmit({ patientId: active[index].id, test: values.test, notes: values.notes });
  }
  return (
    <RecordForm fields={fields} submitLabel="Add test" onSubmit={submit} onCancel={onCancel} />
  );
}

export default function LaboratoryPage() {
  usePageMeta(pageMeta);
  const { rows, loading, error, create, start, cancel, enterResult } = useLab();
  const role = useAdminUser()?.role;
  const canCreate = role === "administrator" || role === "doctor";
  const canCancel = canCreate;
  const canResult = role === "administrator" || role === "lab_technician";
  const table = useTable(rows, {
    searchKeys: SEARCH_KEYS,
    filterKey: "status",
    filterOptions: STATUSES,
    pageSize: 8,
  });
  const [creating, setCreating] = useState(false);
  const [resultFor, setResultFor] = useState(null);
  const [cancelRow, setCancelRow] = useState(null);
  const [busy, setBusy] = useState(false);

  async function run(action, message, tone) {
    if (busy) return false;
    setBusy(true);
    try {
      await action();
      showToast(message, tone);
      return true;
    } catch (e) {
      showToast(e.message, "error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveNew(values) {
    if (await run(() => create(values), "Lab test requested.")) setCreating(false);
  }

  async function saveResult(values) {
    const row = resultFor;
    if (!row) return;
    if (await run(() => enterResult(row.id, values), "Result saved.")) setResultFor(null);
  }

  async function confirmCancel() {
    const row = cancelRow;
    setCancelRow(null);
    if (row) await run(() => cancel(row.id), row.code + " cancelled.", "info");
  }

  const columns = [
    { key: "code", label: "ID", width: "104px" },
    { key: "patientName", label: "Patient", sortable: true },
    { key: "test", label: "Test", sortable: true },
    { key: "created", label: "Requested", sortable: true, width: "120px" },
    {
      key: "status",
      label: "Status",
      width: "140px",
      render: (row) => <StatusPill value={row.status} />,
    },
    {
      key: "actions",
      label: "",
      width: "300px",
      align: "end",
      render: (row) => {
        const open = row.rawStatus === "requested" || row.rawStatus === "in_progress";
        return (
          <span className="cell-actions">
            {row.rawStatus === "requested" && (
              <button
                type="button"
                className="row-confirm"
                onClick={() => run(() => start(row.id), row.code + " started.")}
              >
                <Check size={14} /> Start
              </button>
            )}
            {open && canResult && (
              <button type="button" className="row-confirm" onClick={() => setResultFor(row)}>
                Enter result
              </button>
            )}
            {open && canCancel && (
              <button type="button" className="row-confirm" onClick={() => setCancelRow(row)}>
                Cancel
              </button>
            )}
          </span>
        );
      },
    },
  ];

  return (
    <div className="admin-page">
      <div className="page-actions">
        <p className="page-copy">
          Each test is requested, started, and completed when the result is entered. Tests are never
          deleted.
        </p>
        {canCreate && (
          <button type="button" className="button button-accent" onClick={() => setCreating(true)}>
            <Plus size={16} /> New test
          </button>
        )}
      </div>

      {error && <p className="login-error">{error}</p>}

      <DataTable
        columns={columns}
        table={table}
        emptyText={loading ? "Loading lab tests..." : "No lab tests yet."}
        toolbar={
          <FilterSelect
            label="Status"
            value={table.state.filter}
            options={STATUSES}
            onChange={table.setFilter}
          />
        }
      />

      <Modal open={creating} title="New lab test" onClose={() => setCreating(false)}>
        {creating && <NewTestForm onSubmit={saveNew} onCancel={() => setCreating(false)} />}
      </Modal>

      <Modal
        open={resultFor !== null}
        title={"Enter result for " + (resultFor?.code ?? "test")}
        onClose={() => setResultFor(null)}
      >
        {resultFor && (
          <RecordForm
            fields={RESULT_FIELDS}
            submitLabel="Save result"
            onSubmit={saveResult}
            onCancel={() => setResultFor(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={cancelRow !== null}
        title="Cancel lab test"
        description="The request is closed and cannot be reopened."
        confirmLabel="Cancel test"
        onCancel={() => setCancelRow(null)}
        onConfirm={confirmCancel}
      />
    </div>
  );
}
