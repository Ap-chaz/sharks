import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

const STATUS_LABEL = {
  draft: "Draft",
  issued: "Issued",
  void: "Void",
};

const METHOD_LABEL = {
  cash: "Cash",
  mpesa: "M-Pesa",
  card: "Card",
  insurance: "Insurance",
  other: "Other",
};

/** Round to 2 decimals (money). */
function money(n) {
  return Math.round(Number(n) * 100) / 100;
}

/** Display status: an issued invoice with nothing left to pay shows as Paid. */
function displayStatus(raw, total, balance) {
  if (raw === "issued" && total > 0 && balance <= 0) return "Paid";
  return STATUS_LABEL[raw] ?? raw;
}

/** Backend invoice (list) -> row shown in the table. */
export function toRow(r) {
  const total = money(r.total);
  const paid = money(r.paid);
  const balance = money(total - paid);
  return {
    id: r.id,
    code: "INV-" + r.id,
    patientId: r.patientId,
    patientName: r.patientName,
    total,
    paid,
    balance,
    status: displayStatus(r.status, total, balance),
    rawStatus: r.status,
    created: String(r.createdAt || "").slice(0, 10),
  };
}

/** Backend invoice (detail) -> object for the View and Edit windows. */
export function toDetail(p) {
  return {
    ...toRow(p),
    notes: p.notes ?? "",
    items: (p.items || []).map((i) => ({
      description: i.description,
      quantity: String(i.quantity),
      unitPrice: String(i.unitPrice),
    })),
    payments: (p.payments || []).map((x) => ({
      id: x.id,
      amount: money(x.amount),
      method: METHOD_LABEL[x.method] ?? x.method,
      reference: x.reference ?? "",
      paidAt: String(x.paidAt || "").slice(0, 10),
    })),
  };
}

/** Form items -> API items (numbers). */
function toApiItems(items) {
  return items.map((i) => ({
    description: String(i.description ?? "").trim(),
    quantity: Number(i.quantity),
    unitPrice: Number(i.unitPrice),
  }));
}

export function useBilling() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      const data = await api("/billing/invoices");
      setRows(data.invoices.map(toRow));
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  /** Loads one invoice with its items and payments. */
  async function get(id) {
    const data = await api("/billing/invoices/" + id);
    return toDetail(data.invoice);
  }

  /** values: { patientId, notes, items }. New invoices start as drafts. */
  async function create(values) {
    const body = {
      patientId: Number(values.patientId),
      items: toApiItems(values.items),
    };
    const notes = String(values.notes ?? "").trim();
    if (notes) body.notes = notes;
    await api("/billing/invoices", { method: "POST", body });
    await reload();
  }

  /** Drafts only. values: { notes, items }. */
  async function update(id, values) {
    const body = {
      notes: String(values.notes ?? "").trim(),
      items: toApiItems(values.items),
    };
    await api("/billing/invoices/" + id, { method: "PATCH", body });
    await reload();
  }

  /** Draft -> issued. Items are locked afterwards. */
  async function issue(id) {
    await api("/billing/invoices/" + id, { method: "PATCH", body: { status: "issued" } });
    await reload();
  }

  /** Final. The backend refuses it when the invoice has payments. */
  async function voidInvoice(id) {
    await api("/billing/invoices/" + id, { method: "PATCH", body: { status: "void" } });
    await reload();
  }

  /** values: { amount, method, reference }. Method is the API value (cash, mpesa, ...). */
  async function pay(id, values) {
    const body = {
      amount: Number(values.amount),
      method: values.method,
    };
    const reference = String(values.reference ?? "").trim();
    if (reference) body.reference = reference;
    await api("/billing/invoices/" + id + "/payments", { method: "POST", body });
    await reload();
  }

  return { rows, loading, error, reload, get, create, update, issue, voidInvoice, pay };
}
