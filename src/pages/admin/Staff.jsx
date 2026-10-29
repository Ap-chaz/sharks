import { usePageMeta } from "@/lib/use-page-meta";
import { KeyRound, Plus, Power } from "lucide-react";
import { useState } from "react";
import { DataTable, FilterSelect, useTable } from "@/components/admin/DataTable";
import { ConfirmDialog, Modal } from "@/components/admin/Modal";
import { RecordForm } from "@/components/admin/RecordForm";
import { StatusPill } from "@/components/admin/StatusPill";
import { showToast } from "@/lib/toast";
import { useStaff } from "@/lib/use-staff";

const pageMeta = [
  { title: "Staff management \u2014 SHARKS Clinic" },
  { name: "description", content: "Manage SHARKS Clinic staff accounts." },
  { name: "robots", content: "noindex" },
];

const SEARCH_KEYS = ["name", "username"];
const STATUSES = ["Active", "Deactivated"];
const ROLE_BY_LABEL = {
  Doctor: "doctor",
  Receptionist: "receptionist",
  "Lab technician": "lab_technician",
};
const ROLE_LABELS = Object.keys(ROLE_BY_LABEL);

const ADD_FIELDS = [
  { name: "username", label: "Username", required: true, placeholder: "letters, numbers, _" },
  { name: "fullName", label: "Full name", required: true },
  { name: "role", label: "Role", type: "select", required: true, options: ROLE_LABELS },
  {
    name: "password",
    label: "Password (12 to 200 characters)",
    type: "password",
    required: true,
  },
];
const EDIT_FIELDS = [
  { name: "fullName", label: "Full name", required: true },
  { name: "role", label: "Role", type: "select", required: true, options: ROLE_LABELS },
];
const PASSWORD_FIELDS = [
  {
    name: "password",
    label: "New password (12 to 200 characters)",
    type: "password",
    required: true,
    full: true,
  },
];

function checkPassword(password) {
  if (password.length < 12 || password.length > 200) {
    showToast("Password must be 12 to 200 characters.", "error");
    return false;
  }
  return true;
}

export default function StaffPage() {
  usePageMeta(pageMeta);
  const { rows, loading, error, create, update, setActive, resetPassword } = useStaff();
  const table = useTable(rows, {
    searchKeys: SEARCH_KEYS,
    filterKey: "status",
    filterOptions: STATUSES,
    pageSize: 8,
  });
  const [adding, setAdding] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [resetRow, setResetRow] = useState(null);
  const [offRow, setOffRow] = useState(null);
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
    if (!/^[A-Za-z0-9_]{3,60}$/.test(values.username)) {
      showToast("Username: 3 to 60 letters, numbers or underscores.", "error");
      return;
    }
    if (values.fullName.length < 2 || values.fullName.length > 120) {
      showToast("Full name must be 2 to 120 characters.", "error");
      return;
    }
    const role = ROLE_BY_LABEL[values.role];
    if (!role) {
      showToast("Choose a role.", "error");
      return;
    }
    if (!checkPassword(values.password)) return;
    const body = {
      username: values.username,
      fullName: values.fullName,
      role,
      password: values.password,
    };
    if (await run(() => create(body), "Staff member added.")) setAdding(false);
  }

  async function saveEdit(values) {
    const row = editRow;
    if (!row) return;
    if (values.fullName.length < 2 || values.fullName.length > 120) {
      showToast("Full name must be 2 to 120 characters.", "error");
      return;
    }
    const role = ROLE_BY_LABEL[values.role];
    if (!role) {
      showToast("Choose a role.", "error");
      return;
    }
    const body = { fullName: values.fullName, role };
    if (await run(() => update(row.id, body), "Staff member updated.")) setEditRow(null);
  }

  async function saveReset(values) {
    const row = resetRow;
    if (!row) return;
    if (!checkPassword(values.password)) return;
    const password = values.password;
    if (
      await run(() => resetPassword(row.id, password), "Password reset. They must sign in again.")
    )
      setResetRow(null);
  }

  async function confirmOff() {
    const row = offRow;
    setOffRow(null);
    if (row) await run(() => setActive(row.id, false), row.name + " deactivated.", "info");
  }

  const columns = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (row) => (
        <div>
          <div>{row.name}</div>
          <small>{row.username}</small>
        </div>
      ),
    },
    { key: "role", label: "Role", sortable: true, width: "150px" },
    {
      key: "status",
      label: "Status",
      width: "140px",
      render: (row) => <StatusPill value={row.status} />,
    },
    { key: "lastLogin", label: "Last sign-in", sortable: true, width: "130px" },
    {
      key: "actions",
      label: "",
      width: "330px",
      align: "end",
      render: (row) => {
        if (row.rawRole === "administrator") return null;
        return (
          <span className="cell-actions">
            <button type="button" className="row-confirm" onClick={() => setEditRow(row)}>
              Edit
            </button>
            <button type="button" className="row-confirm" onClick={() => setResetRow(row)}>
              <KeyRound size={14} /> Reset password
            </button>
            {row.isActive ? (
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
          Staff accounts sign in with a username and password. Accounts are deactivated, never
          deleted. The administrator account cannot be changed here.
        </p>
        <button type="button" className="button button-accent" onClick={() => setAdding(true)}>
          <Plus size={16} /> Add staff
        </button>
      </div>

      {error && <p className="login-error">{error}</p>}

      <DataTable
        columns={columns}
        table={table}
        emptyText={loading ? "Loading staff..." : "No staff yet."}
        toolbar={
          <FilterSelect
            label="Status"
            value={table.state.filter}
            options={STATUSES}
            onChange={table.setFilter}
          />
        }
      />

      <Modal open={adding} title="Add staff" onClose={() => setAdding(false)}>
        {adding && (
          <RecordForm
            fields={ADD_FIELDS}
            submitLabel="Add staff"
            onSubmit={saveNew}
            onCancel={() => setAdding(false)}
          />
        )}
      </Modal>

      <Modal
        open={editRow !== null}
        title={"Edit " + (editRow?.name ?? "staff member")}
        onClose={() => setEditRow(null)}
      >
        {editRow && (
          <RecordForm
            fields={EDIT_FIELDS}
            initial={{ fullName: editRow.name, role: editRow.role }}
            submitLabel="Save changes"
            onSubmit={saveEdit}
            onCancel={() => setEditRow(null)}
          />
        )}
      </Modal>

      <Modal
        open={resetRow !== null}
        title={"Reset password for " + (resetRow?.name ?? "staff member")}
        onClose={() => setResetRow(null)}
      >
        {resetRow && (
          <RecordForm
            fields={PASSWORD_FIELDS}
            submitLabel="Reset password"
            onSubmit={saveReset}
            onCancel={() => setResetRow(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={offRow !== null}
        title="Deactivate account"
        description="They are signed out now and cannot sign in until you reactivate the account."
        confirmLabel="Deactivate"
        onCancel={() => setOffRow(null)}
        onConfirm={confirmOff}
      />
    </div>
  );
}
