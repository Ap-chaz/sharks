import { usePageMeta } from "@/lib/use-page-meta";
import { Plus } from "lucide-react";
import { useState } from "react";
import { DataTable, FilterSelect, useTable } from "@/components/admin/DataTable";
import { ConfirmDialog, Modal } from "@/components/admin/Modal";
import { Money, StatCard } from "@/components/admin/Blocks";
import { StatusPill } from "@/components/admin/StatusPill";
import { showToast } from "@/lib/toast";
import { useBilling } from "@/lib/use-billing";
import { usePatients } from "@/lib/use-patients";

const pageMeta = [
  { title: "Billing \u2014 SHARKS Clinic" },
  { name: "description", content: "Track SHARKS Clinic invoices, payments and balances." },
  { name: "robots", content: "noindex" },
];

const CURRENCY = "KES";
const SEARCH_KEYS = ["patientName", "code"];
const STATUSES = ["Draft", "Issued", "Paid", "Void"];
const MAX_ITEMS = 50;
const METHODS = [
  ["cash", "Cash"],
  ["mpesa", "M-Pesa"],
  ["card", "Card"],
  ["insurance", "Insurance"],
  ["other", "Other"],
];
const BOX = {
  border: "1px solid rgba(128, 128, 128, 0.35)",
  borderRadius: 8,
  padding: 12,
  display: "grid",
  gap: 8,
};

function emptyItem() {
  return { description: "", quantity: "1", unitPrice: "" };
}

function money(n) {
  return Math.round(Number(n) * 100) / 100;
}

function InvoiceForm({ initial, submitLabel, onSubmit, onCancel }) {
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

  const total = items.reduce((sum, it) => {
    const q = Number(it.quantity);
    const p = Number(it.unitPrice);
    return Number.isFinite(q) && Number.isFinite(p) ? sum + q * p : sum;
  }, 0);

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
      const q = Number(it.quantity);
      const p = Number(it.unitPrice);
      const where = "Line " + (n + 1) + ": ";
      if (it.description.trim().length < 2) {
        setError(where + "description is required.");
        return;
      }
      if (!Number.isInteger(q) || q < 1 || q > 1000) {
        setError(where + "quantity must be a whole number from 1 to 1000.");
        return;
      }
      if (it.unitPrice.trim() === "" || !Number.isFinite(p) || p < 0 || p > 10000000) {
        setError(where + "enter a unit price from 0 to 10,000,000.");
        return;
      }
      if (Math.abs(p * 100 - Math.round(p * 100)) > 1e-6) {
        setError(where + "unit price can have at most 2 decimals.");
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
            <strong>Line {index + 1}</strong>
            <label className="field record-field">
              <span>Description</span>
              <input
                type="text"
                maxLength={255}
                value={it.description}
                placeholder="Consultation"
                onChange={(e) => setItem(index, "description", e.target.value)}
              />
            </label>
            <label className="field record-field">
              <span>Quantity</span>
              <input
                type="text"
                inputMode="numeric"
                value={it.quantity}
                onChange={(e) => setItem(index, "quantity", e.target.value)}
              />
            </label>
            <label className="field record-field">
              <span>Unit price (KES)</span>
              <input
                type="text"
                inputMode="decimal"
                value={it.unitPrice}
                placeholder="1500"
                onChange={(e) => setItem(index, "unitPrice", e.target.value)}
              />
            </label>
            {items.length > 1 && (
              <div>
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => setItems(items.filter((_, i) => i !== index))}
                >
                  Remove line {index + 1}
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
            <Plus size={16} /> Add line
          </button>
        </div>
        <p className="span-2">
          <strong>Total: </strong>
          <Money amount={money(total)} currency={CURRENCY} />
        </p>
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

function PaymentForm({ balance, onSubmit, onCancel }) {
  const [amount, setAmount] = useState(String(balance));
  const [method, setMethod] = useState("mpesa");
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    const a = Number(amount);
    if (amount.trim() === "" || !Number.isFinite(a) || a <= 0) {
      setError("Enter an amount above 0.");
      return;
    }
    if (Math.abs(a * 100 - Math.round(a * 100)) > 1e-6) {
      setError("Amount can have at most 2 decimals.");
      return;
    }
    if (a > balance) {
      setError("Amount is more than the balance due.");
      return;
    }
    setError("");
    onSubmit({ amount: a, method, reference });
  }

  return (
    <form className="record-form" onSubmit={submit} noValidate>
      <p>
        Balance due: <Money amount={balance} currency={CURRENCY} />
      </p>
      <div className="record-grid">
        <label className="field record-field">
          <span>Amount (KES)</span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="field record-field">
          <span>Method</span>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field record-field span-2">
          <span>Reference</span>
          <input
            type="text"
            maxLength={80}
            value={reference}
            placeholder="Optional, for example M-Pesa code"
            onChange={(e) => setReference(e.target.value)}
          />
        </label>
      </div>
      {error && <p className="login-error">{error}</p>}
      <div className="modal-actions">
        <button type="button" className="button button-outline" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button button-accent">
          Record payment
        </button>
      </div>
    </form>
  );
}

export default function BillingPage() {
  usePageMeta(pageMeta);
  const { rows, loading, error, get, create, update, issue, voidInvoice, pay } = useBilling();
  const table = useTable(rows, {
    searchKeys: SEARCH_KEYS,
    filterKey: "status",
    filterOptions: STATUSES,
    pageSize: 8,
  });
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState(null);
  const [editing, setEditing] = useState(null);
  const [paying, setPaying] = useState(null);
  const [issueRow, setIssueRow] = useState(null);
  const [voidRow, setVoidRow] = useState(null);
  const [busy, setBusy] = useState(false);

  const live = rows.filter((r) => r.rawStatus !== "void");
  const collected = money(live.reduce((s, r) => s + r.paid, 0));
  const outstanding = money(
    rows.filter((r) => r.rawStatus === "issued").reduce((s, r) => s + r.balance, 0),
  );
  const drafts = rows.filter((r) => r.rawStatus === "draft").length;

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
    if (await run(() => create(values), "Invoice created as a draft.")) setCreating(false);
  }

  async function saveEdit(values) {
    const row = editing;
    if (!row) return;
    if (await run(() => update(row.id, values), row.code + " updated.")) setEditing(null);
  }

  async function savePayment(values) {
    const row = paying;
    if (!row) return;
    if (await run(() => pay(row.id, values), "Payment recorded for " + row.code + "."))
      setPaying(null);
  }

  async function confirmIssue() {
    const row = issueRow;
    setIssueRow(null);
    if (row) await run(() => issue(row.id), row.code + " issued.");
  }

  async function confirmVoid() {
    const row = voidRow;
    setVoidRow(null);
    if (row) await run(() => voidInvoice(row.id), row.code + " voided.", "info");
  }

  const columns = [
    { key: "code", label: "Invoice", width: "110px" },
    { key: "patientName", label: "Patient", sortable: true },
    {
      key: "total",
      label: "Total",
      align: "end",
      sortable: true,
      width: "130px",
      render: (row) => <Money amount={row.total} currency={CURRENCY} />,
    },
    {
      key: "paid",
      label: "Paid",
      align: "end",
      width: "130px",
      render: (row) => <Money amount={row.paid} currency={CURRENCY} />,
    },
    {
      key: "balance",
      label: "Balance",
      align: "end",
      width: "130px",
      render: (row) =>
        row.rawStatus === "void" ? "-" : <Money amount={row.balance} currency={CURRENCY} />,
    },
    { key: "created", label: "Created", sortable: true, width: "110px" },
    {
      key: "status",
      label: "Status",
      width: "120px",
      render: (row) => <StatusPill value={row.status} />,
    },
    {
      key: "actions",
      label: "",
      width: "110px",
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
      <div className="stat-grid">
        <StatCard label="Collected" value={CURRENCY + " " + collected.toLocaleString("en-KE")} />
        <StatCard
          label="Outstanding"
          value={CURRENCY + " " + outstanding.toLocaleString("en-KE")}
        />
        <StatCard label="Drafts" value={String(drafts)} />
        <StatCard label="Invoices" value={String(rows.length)} hint="All time" />
      </div>

      <div className="page-actions">
        <p className="page-copy">
          Invoices start as drafts. Issue one to take payments. Payments and voided invoices can
          never be changed or deleted.
        </p>
        <button type="button" className="button button-accent" onClick={() => setCreating(true)}>
          <Plus size={16} /> New invoice
        </button>
      </div>

      {error && <p className="login-error">{error}</p>}

      <DataTable
        columns={columns}
        table={table}
        emptyText={loading ? "Loading invoices..." : "No invoices yet."}
        toolbar={
          <FilterSelect
            label="Status"
            value={table.state.filter}
            options={STATUSES}
            onChange={table.setFilter}
          />
        }
      />

      <Modal open={creating} title="New invoice" onClose={() => setCreating(false)}>
        {creating && (
          <InvoiceForm
            submitLabel="Create draft"
            onSubmit={saveNew}
            onCancel={() => setCreating(false)}
          />
        )}
      </Modal>

      <Modal
        open={detail !== null}
        title={detail ? detail.code + " - " + detail.patientName : "Invoice"}
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
                  <strong>{i.description}</strong> - {i.quantity} x{" "}
                  <Money amount={Number(i.unitPrice)} currency={CURRENCY} />
                </li>
              ))}
            </ol>
            <p>
              Total: <Money amount={detail.total} currency={CURRENCY} /> | Paid:{" "}
              <Money amount={detail.paid} currency={CURRENCY} />
              {detail.rawStatus !== "void" && (
                <>
                  {" "}
                  | Balance: <Money amount={detail.balance} currency={CURRENCY} />
                </>
              )}
            </p>
            {detail.payments.length > 0 && (
              <>
                <strong>Payments</strong>
                <ul>
                  {detail.payments.map((x) => (
                    <li key={x.id}>
                      {x.paidAt} - <Money amount={x.amount} currency={CURRENCY} /> - {x.method}
                      {x.reference ? " (" + x.reference + ")" : ""}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="button button-outline"
                onClick={() => setDetail(null)}
              >
                Close
              </button>
              {detail.rawStatus === "draft" && (
                <>
                  <button
                    type="button"
                    className="button button-outline"
                    onClick={() => {
                      setVoidRow(detail);
                      setDetail(null);
                    }}
                  >
                    Void
                  </button>
                  <button
                    type="button"
                    className="button button-outline"
                    onClick={() => {
                      setEditing(detail);
                      setDetail(null);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="button button-accent"
                    onClick={() => {
                      setIssueRow(detail);
                      setDetail(null);
                    }}
                  >
                    Issue
                  </button>
                </>
              )}
              {detail.rawStatus === "issued" && (
                <>
                  {detail.payments.length === 0 && (
                    <button
                      type="button"
                      className="button button-outline"
                      onClick={() => {
                        setVoidRow(detail);
                        setDetail(null);
                      }}
                    >
                      Void
                    </button>
                  )}
                  {detail.balance > 0 && (
                    <button
                      type="button"
                      className="button button-accent"
                      onClick={() => {
                        setPaying(detail);
                        setDetail(null);
                      }}
                    >
                      Record payment
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={editing !== null}
        title={"Edit " + (editing?.code ?? "invoice")}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <InvoiceForm
            initial={editing}
            submitLabel="Save changes"
            onSubmit={saveEdit}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <Modal
        open={paying !== null}
        title={"Record payment for " + (paying?.code ?? "invoice")}
        onClose={() => setPaying(null)}
      >
        {paying && (
          <PaymentForm
            balance={paying.balance}
            onSubmit={savePayment}
            onCancel={() => setPaying(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={issueRow !== null}
        title="Issue invoice"
        description="Items can no longer be changed after issuing. Payments can then be recorded."
        confirmLabel="Issue invoice"
        onCancel={() => setIssueRow(null)}
        onConfirm={confirmIssue}
      />

      <ConfirmDialog
        open={voidRow !== null}
        title="Void invoice"
        description="The invoice is closed and cannot be changed or reopened."
        confirmLabel="Void invoice"
        onCancel={() => setVoidRow(null)}
        onConfirm={confirmVoid}
      />
    </div>
  );
}
