import { usePageMeta } from "@/lib/use-page-meta";
import { Check, Plus, X } from "lucide-react";
import { useState } from "react";
import { DataTable, FilterSelect, useTable } from "@/components/admin/DataTable";
import { ConfirmDialog, Modal } from "@/components/admin/Modal";
import { NewAppointmentForm } from "@/components/admin/NewAppointmentForm";
import { StatusPill } from "@/components/admin/StatusPill";
import { showToast } from "@/lib/toast";
import { useAdminUser } from "@/lib/admin-user";
import { shiftDate, todayInNairobi, useAppointments } from "@/lib/use-appointments";

const pageMeta = [
  { title: "Appointments \u2014 SHARKS Clinic" },
  { name: "description", content: "Review and confirm SHARKS Clinic appointment requests." },
  { name: "robots", content: "noindex" },
];

const SEARCH_KEYS = ["patientName", "phone", "department", "doctor", "code", "reason"];
const STATUSES = ["Pending", "Confirmed", "Completed", "Cancelled", "No show"];

export default function AppointmentsPage() {
  usePageMeta(pageMeta);
  const { view, setView, date, setDate, rows, loading, error, setStatus, reload } =
    useAppointments();
  const table = useTable(rows, {
    searchKeys: SEARCH_KEYS,
    filterKey: "status",
    filterOptions: STATUSES,
    pageSize: 8,
  });
  const [cancelRow, setCancelRow] = useState(null);
  const role = useAdminUser()?.role;
  const canFinish = role === "administrator" || role === "doctor";
  const [creating, setCreating] = useState(false);

  async function confirmRow(row) {
    try {
      await setStatus(row.id, "confirmed");
      showToast(`Appointment ${row.code} confirmed.`);
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  async function finishRow(row, statusKey, label) {
    try {
      await setStatus(row.id, statusKey);
      showToast(`Appointment ${row.code} marked ${label}.`);
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  async function cancelNow() {
    const row = cancelRow;
    setCancelRow(null);
    if (!row) return;
    try {
      await setStatus(row.id, "cancelled");
      showToast(`Appointment ${row.code} cancelled.`, "info");
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  const columns = [
    { key: "code", label: "ID", width: "96px" },
    {
      key: "patientName",
      label: "Patient",
      sortable: true,
      render: (row) => (
        <span className="cell-stack">
          <strong>{row.patientName}</strong>
          <small>{row.phone}</small>
        </span>
      ),
    },
    {
      key: "department",
      label: "Department",
      sortable: true,
      render: (row) => row.department || "-",
    },
    { key: "doctor", label: "Doctor" },
    {
      key: "sortKey",
      label: "When",
      sortable: true,
      width: "150px",
      render: (row) => (
        <span className="cell-stack">
          <strong>{row.date}</strong>
          <small>{row.time}</small>
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: "140px",
      render: (row) => <StatusPill value={row.status} />,
    },
    {
      key: "source",
      label: "Source",
      width: "110px",
      render: (row) => (
        <span className="badge">{row.source === "website" ? "Website" : "Staff"}</span>
      ),
    },
    {
      key: "actions",
      label: "",
      width: "280px",
      align: "end",
      render: (row) => (
        <span className="cell-actions">
          {row.statusKey === "pending" && (
            <button type="button" className="row-confirm" onClick={() => confirmRow(row)}>
              <Check size={14} /> Confirm
            </button>
          )}
          {row.statusKey === "confirmed" && canFinish && (
            <>
              <button
                type="button"
                className="row-confirm"
                onClick={() => finishRow(row, "completed", "completed")}
              >
                <Check size={14} /> Complete
              </button>
              <button
                type="button"
                className="row-confirm"
                onClick={() => finishRow(row, "no_show", "no show")}
              >
                No show
              </button>
            </>
          )}
          {(row.statusKey === "pending" || row.statusKey === "confirmed") && (
            <span className="row-actions">
              <button
                type="button"
                className="row-actions-danger"
                onClick={() => setCancelRow(row)}
                aria-label="Cancel appointment"
              >
                <X size={14} />
              </button>
            </span>
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="admin-page">
      <div className="page-actions">
        <p className="page-copy">
          Requests from the public booking form arrive here as <strong>Pending</strong>. Confirm or
          cancel them, and use the day view to see a whole day.
        </p>
        <button type="button" className="button button-accent" onClick={() => setCreating(true)}>
          <Plus size={16} /> New appointment
        </button>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <button
          type="button"
          className={view === "day" ? "button button-accent" : "button button-outline"}
          onClick={() => setView("day")}
        >
          Day view
        </button>
        <button
          type="button"
          className={view === "pending" ? "button button-accent" : "button button-outline"}
          onClick={() => setView("pending")}
        >
          Pending requests
        </button>
        {view === "day" && (
          <>
            <button
              type="button"
              className="button button-outline"
              onClick={() => setDate(shiftDate(date, -1))}
            >
              Previous day
            </button>
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              aria-label="Choose day"
            />
            <button
              type="button"
              className="button button-outline"
              onClick={() => setDate(shiftDate(date, 1))}
            >
              Next day
            </button>
            <button
              type="button"
              className="button button-outline"
              onClick={() => setDate(todayInNairobi())}
            >
              Today
            </button>
          </>
        )}
      </div>

      {error && <p className="login-error">{error}</p>}

      <DataTable
        columns={columns}
        table={table}
        emptyText={
          loading
            ? "Loading appointments..."
            : view === "pending"
              ? "No pending requests."
              : "No appointments on this day."
        }
        toolbar={
          <FilterSelect
            label="Status"
            value={table.state.filter}
            options={STATUSES}
            onChange={table.setFilter}
          />
        }
      />

      <Modal open={creating} title="New appointment" onClose={() => setCreating(false)}>
        <NewAppointmentForm
          onCancel={() => setCreating(false)}
          onSaved={(savedDate) => {
            setCreating(false);
            setView("day");
            setDate(savedDate);
            reload();
          }}
        />
      </Modal>

      <ConfirmDialog
        open={cancelRow !== null}
        title="Cancel appointment"
        description="The booking is marked as cancelled and stays in the records. This cannot be undone from here."
        confirmLabel="Yes, cancel appointment"
        onCancel={() => setCancelRow(null)}
        onConfirm={cancelNow}
      />
    </div>
  );
}
