import { usePageMeta } from "@/lib/use-page-meta";
import { Plus, Power } from "lucide-react";
import { useState } from "react";
import { DataTable, FilterSelect, useTable } from "@/components/admin/DataTable";
import { ConfirmDialog, Modal } from "@/components/admin/Modal";
import { RecordForm } from "@/components/admin/RecordForm";
import { StatusPill } from "@/components/admin/StatusPill";
import { showToast } from "@/lib/toast";
import { useDoctors } from "@/lib/use-doctors";

const pageMeta = [
  { title: "Doctors \u2014 SHARKS Clinic" },
  { name: "description", content: "Clinical team at SHARKS Clinic." },
  { name: "robots", content: "noindex" },
];

const SEARCH_KEYS = ["name", "login"];
const STATUSES = ["Active", "Inactive"];
const NO_LOGIN = "No login";

export default function DoctorsPage() {
  usePageMeta(pageMeta);
  const { rows, logins, loading, error, create, update, setActive } = useDoctors();
  const table = useTable(rows, {
    searchKeys: SEARCH_KEYS,
    filterKey: "status",
    filterOptions: STATUSES,
    pageSize: 8,
  });
  const [adding, setAdding] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [offRow, setOffRow] = useState(null);
  const [busy, setBusy] = useState(false);

  // Doctor logins not already linked to another doctor.
  function freeLogins(forRow) {
    return logins.filter((l) => !rows.some((r) => r.userId === l.id && r.id !== forRow?.id));
  }

  function loginOptions(forRow) {
    return [NO_LOGIN, ...freeLogins(forRow).map((l) => l.label)];
  }

  function loginIdFor(label, forRow) {
    const found = freeLogins(forRow).find((l) => l.label === label);
    return found ? found.id : null;
  }

  function nameFields() {
    return [{ name: "fullName", label: "Full name", required: true, full: true }];
  }

  function formFields(forRow) {
    return [
      ...nameFields(),
      {
        name: "login",
        label: "Linked login (optional)",
        type: "select",
        options: loginOptions(forRow),
        full: true,
      },
    ];
  }

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

  function badName(name) {
    if (name.length < 2 || name.length > 120) {
      showToast("Full name must be 2 to 120 characters.", "error");
      return true;
    }
    return false;
  }

  async function saveNew(values) {
    if (badName(values.fullName)) return;
    const body = { fullName: values.fullName, userId: loginIdFor(values.login, null) };
    if (await run(() => create(body), "Doctor added.")) setAdding(false);
  }

  async function saveEdit(values) {
    const row = editRow;
    if (!row) return;
    if (badName(values.fullName)) return;
    const body = { fullName: values.fullName };
    if (!row.isDefault) body.userId = loginIdFor(values.login, row);
    if (await run(() => update(row.id, body), "Doctor updated.")) setEditRow(null);
  }

  async function confirmOff() {
    const row = offRow;
    setOffRow(null);
    if (row) await run(() => setActive(row.id, false), row.name + " deactivated.", "info");
  }

  const columns = [
    { key: "id", label: "ID", sortable: true, width: "80px" },
    { key: "name", label: "Doctor", sortable: true },
    { key: "login", label: "Linked login", sortable: true },
    {
      key: "status",
      label: "Status",
      width: "140px",
      render: (row) => <StatusPill value={row.status} />,
    },
    { key: "defaultLabel", label: "Default", width: "110px" },
    {
      key: "actions",
      label: "",
      width: "230px",
      align: "end",
      render: (row) => (
        <span className="cell-actions">
          <button type="button" className="row-confirm" onClick={() => setEditRow(row)}>
            Edit
          </button>
          {!row.isDefault &&
            (row.isActive ? (
              <button type="button" className="row-confirm" onClick={() => setOffRow(row)}>
                <Power size={14} /> Deactivate
              </button>
            ) : (
              <button
                type="button"
                className="row-confirm"
                onClick={() => run(() => setActive(row.id, true), row.name + " reactivated.")}
              >
                <Power size={14} /> Reactivate
              </button>
            ))}
        </span>
      ),
    },
  ];

  return (
    <div className="admin-page">
      <div className="page-actions">
        <p className="page-copy">
          Doctors that appointments can be assigned to. Doctors are deactivated, never deleted. The
          default doctor receives all website booking requests and cannot be deactivated or
          re-linked.
        </p>
        <button type="button" className="button button-accent" onClick={() => setAdding(true)}>
          <Plus size={16} /> Add doctor
        </button>
      </div>

      {error && <p className="login-error">{error}</p>}

      <DataTable
        columns={columns}
        table={table}
        emptyText={loading ? "Loading doctors..." : "No doctors yet."}
        toolbar={
          <FilterSelect
            label="Status"
            value={table.state.filter}
            options={STATUSES}
            onChange={table.setFilter}
          />
        }
      />

      <Modal open={adding} title="Add doctor" onClose={() => setAdding(false)}>
        {adding && (
          <RecordForm
            fields={formFields(null)}
            initial={{ login: NO_LOGIN }}
            submitLabel="Add doctor"
            onSubmit={saveNew}
            onCancel={() => setAdding(false)}
          />
        )}
      </Modal>

      <Modal
        open={editRow !== null}
        title={"Edit " + (editRow?.name ?? "doctor")}
        onClose={() => setEditRow(null)}
      >
        {editRow && (
          <RecordForm
            fields={editRow.isDefault ? nameFields() : formFields(editRow)}
            initial={{
              fullName: editRow.name,
              login: logins.find((l) => l.id === editRow.userId)?.label ?? NO_LOGIN,
            }}
            submitLabel="Save changes"
            onSubmit={saveEdit}
            onCancel={() => setEditRow(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={offRow !== null}
        title="Deactivate doctor"
        description="They can no longer be chosen for new appointments. Existing appointments stay as they are."
        confirmLabel="Deactivate"
        onCancel={() => setOffRow(null)}
        onConfirm={confirmOff}
      />
    </div>
  );
}
