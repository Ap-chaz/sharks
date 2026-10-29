import { usePageMeta } from "@/lib/use-page-meta";
import { Plus } from "lucide-react";
import { useState } from "react";
import { DataTable, FilterSelect, useTable } from "@/components/admin/DataTable";
import { ConfirmDialog, Modal } from "@/components/admin/Modal";
import { StatusPill } from "@/components/admin/StatusPill";
import { showToast } from "@/lib/toast";
import { usePrescriptions } from "@/lib/use-prescriptions";
import { usePatients } from "@/lib/use-patients";

const pageMeta = [
  { title: "Prescriptions \u2014 SHARKS Clinic" },
  { name: "description", content: "Review medication prescribed by SHARKS Clinic doctors." },
  { name: "robots", content: "noindex" },
];

const SEARCH_KEYS = ["patientName", "code"];
const STATUSES = ["Active", "Cancelled"];
const MAX_ITEMS = 20;
const ITEM_FIELDS = [
  ["medication", "Medication", "Amoxicillin", 120],
  ["dosage", "Dosage", "500mg", 80],
  ["frequency", "Frequency", "3 times daily", 80],
  ["duration", "Duration", "7 days", 80],
  ["instructions", "Instructions (optional)", "After meals", 255],
];
const BOX = {
  border: "1px solid rgba(128, 128, 128, 0.35)",
  borderRadius: 8,
  padding: 12,
  display: "grid",
  gap: 8,
};

function emptyItem() {
  return { medication: "", dosage: "", frequency: "", duration: "", instructions: "" };
}

function PrescriptionForm({ initial, submitLabel, onSubmit, onCancel }) {
  const { rows } = usePatients();
  const isNew = !initial;
  const active = rows.filter((p) => p.status === "Active");
  const labels = active.map((p) => p.code + " " + p.name);
  const [patient, setPatient] = useState("");
  const [notes, setNotes] = useState(initial ? initial.notes : "");
  const [items, setItems] = useState(
    initial ? initial.items.map((i) => ({ ...i })) : [emptyItem()],
  );
  const [error, setError] = useState("");

  function setItem(index, name, value) {
    setItems(items.map((it, i) => (i === index ? { ...it, [name]: value } : it)));
  }

  function submit(event) {
    event.preventDefault();
    let patientId;
    if (isNew) {
      const index = labels.indexOf(patient);
      if (index === -1) {
        setError("Choose a patient.");
        return;
      }
      patientId = active[index].id;
    }
    for (let n = 0; n < items.length; n++) {
      const it = items[n];
      if (
        it.medication.trim().length < 2 ||
        !it.dosage.trim() ||
        !it.frequency.trim() ||
        !it.duration.trim()
      ) {
        setError(
          "Medicine " + (n + 1) + ": medication, dosage, frequency and duration are required.",
        );
        return;
      }
    }
    setError("");
    onSubmit({ patientId, notes, items });
  }

  return (
    <form className="record-form" onSubmit={submit} noValidate>
      <div className="record-grid">
        {isNew && (
          <label className="field record-field span-2">
            <span>Patient</span>
            <select value={patient} onChange={(e) => setPatient(e.target.value)}>
              <option value="">Select patient</option>
              {labels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field record-field span-2">
          <span>Notes</span>
          <textarea
            rows={3}
            maxLength={500}
            value={notes}
            placeholder="Optional"
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        {items.map((it, index) => (
          <div key={index} className="span-2" style={BOX}>
            <strong>Medicine {index + 1}</strong>
            {ITEM_FIELDS.map(([name, label, placeholder, max]) => (
              <label key={name} className="field record-field">
                <span>{label}</span>
                <input
                  type="text"
                  maxLength={max}
                  value={it[name]}
                  placeholder={placeholder}
                  onChange={(e) => setItem(index, name, e.target.value)}
                />
              </label>
            ))}
            {items.length > 1 && (
              <div>
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => setItems(items.filter((_, i) => i !== index))}
                >
                  Remove medicine {index + 1}
                </button>
              </div>
            )}
          </div>
        ))}
        <div className="span-2">
          <button
            type="button"
            className="button button-outline"
            disabled={items.length >= MAX_ITEMS}
            onClick={() => setItems([...items, emptyItem()])}
          >
            <Plus size={16} /> Add medicine
          </button>
        </div>
      </div>
      {error && <p className="login-error">{error}</p>}
      <div className="modal-actions">
        <button type="button" className="button button-outline" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button button-accent">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

export default function PrescriptionsPage() {
  usePageMeta(pageMeta);
  const { rows, loading, error, get, create, update, cancel } = usePrescriptions();
  const table = useTable(rows, {
    searchKeys: SEARCH_KEYS,
    filterKey: "status",
    filterOptions: STATUSES,
    pageSize: 8,
  });
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(null);
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

  async function openView(row) {
    if (busy) return;
    setBusy(true);
    try {
      setDetail(await get(row.id));
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function saveNew(values) {
    if (await run(() => create(values), "Prescription added.")) setCreating(false);
  }

  async function saveEdit(values) {
    const row = editing;
    if (!row) return;
    if (await run(() => update(row.id, values), row.code + " updated.")) setEditing(null);
  }

  async function confirmCancel() {
    const row = cancelRow;
    setCancelRow(null);
    if (row) await run(() => cancel(row.id), row.code + " cancelled.", "info");
  }

  const columns = [
    { key: "code", label: "ID", width: "104px" },
    { key: "patientName", label: "Patient", sortable: true },
    { key: "created", label: "Created", sortable: true, width: "120px" },
    {
      key: "status",
      label: "Status",
      width: "140px",
      render: (row) => <StatusPill value={row.status} />,
    },
    {
      key: "actions",
      label: "",
      width: "120px",
      align: "end",
      render: (row) => (
        <span className="cell-actions">
          <button type="button" className="row-confirm" onClick={() => openView(row)}>
            View
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className="admin-page">
      <div className="page-actions">
        <p className="page-copy">
          Each prescription lists one or more medicines. Cancelling is final. Prescriptions are
          never deleted.
        </p>
        <button type="button" className="button button-accent" onClick={() => setCreating(true)}>
          <Plus size={16} /> New prescription
        </button>
      </div>

      {error && <p className="login-error">{error}</p>}

      <DataTable
        columns={columns}
        table={table}
        emptyText={loading ? "Loading prescriptions..." : "No prescriptions yet."}
        toolbar={
          <FilterSelect
            label="Status"
            value={table.state.filter}
            options={STATUSES}
            onChange={table.setFilter}
          />
        }
      />

      <Modal open={creating} title="New prescription" onClose={() => setCreating(false)}>
        {creating && (
          <PrescriptionForm
            submitLabel="Add prescription"
            onSubmit={saveNew}
            onCancel={() => setCreating(false)}
          />
        )}
      </Modal>

      <Modal
        open={detail !== null}
        title={detail ? detail.code + " - " + detail.patientName : "Prescription"}
        onClose={() => setDetail(null)}
      >
        {detail && (
          <div className="record-form">
            <p>
              <StatusPill value={detail.status} /> Created {detail.created}
            </p>
            {detail.notes && <p>Notes: {detail.notes}</p>}
            <ol>
              {detail.items.map((i, n) => (
                <li key={n}>
                  <strong>{i.medication}</strong> - {i.dosage}, {i.frequency}, {i.duration}
                  {i.instructions ? " (" + i.instructions + ")" : ""}
                </li>
              ))}
            </ol>
            <div className="modal-actions">
              <button
                type="button"
                className="button button-outline"
                onClick={() => setDetail(null)}
              >
                Close
              </button>
              {detail.rawStatus === "active" && (
                <>
                  <button
                    type="button"
                    className="button button-outline"
                    onClick={() => {
                      setCancelRow(detail);
                      setDetail(null);
                    }}
                  >
                    Cancel prescription
                  </button>
                  <button
                    type="button"
                    className="button button-accent"
                    onClick={() => {
                      setEditing(detail);
                      setDetail(null);
                    }}
                  >
                    Edit
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={editing !== null}
        title={"Edit " + (editing?.code ?? "prescription")}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <PrescriptionForm
            initial={editing}
            submitLabel="Save changes"
            onSubmit={saveEdit}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={cancelRow !== null}
        title="Cancel prescription"
        description="The prescription is closed and cannot be changed or reopened."
        confirmLabel="Cancel prescription"
        onCancel={() => setCancelRow(null)}
        onConfirm={confirmCancel}
      />
    </div>
  );
}
