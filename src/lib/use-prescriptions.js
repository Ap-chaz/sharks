import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

const STATUS_LABEL = {
  active: "Active",
  cancelled: "Cancelled",
};

/** Backend prescription (list) -> row shown in the table. */
export function toRow(r) {
  return {
    id: r.id,
    code: "RX-" + r.id,
    patientId: r.patientId,
    patientName: r.patientName,
    status: STATUS_LABEL[r.status] ?? r.status,
    rawStatus: r.status,
    created: String(r.createdAt || "").slice(0, 10),
  };
}

/** Backend prescription (detail) -> object for the View and Edit windows. */
export function toDetail(p) {
  return {
    ...toRow(p),
    notes: p.notes ?? "",
    items: (p.items || []).map((i) => ({
      medication: i.medication,
      dosage: i.dosage,
      frequency: i.frequency,
      duration: i.duration,
      instructions: i.instructions ?? "",
    })),
  };
}

/** Form items -> API items. Blank instructions are left out. */
function toApiItems(items) {
  return items.map((i) => {
    const out = {
      medication: String(i.medication ?? "").trim(),
      dosage: String(i.dosage ?? "").trim(),
      frequency: String(i.frequency ?? "").trim(),
      duration: String(i.duration ?? "").trim(),
    };
    const instructions = String(i.instructions ?? "").trim();
    if (instructions) out.instructions = instructions;
    return out;
  });
}

export function usePrescriptions() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      const data = await api("/prescriptions");
      setRows(data.prescriptions.map(toRow));
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

  /** Loads one prescription with its medicine lines. */
  async function get(id) {
    const data = await api("/prescriptions/" + id);
    return toDetail(data.prescription);
  }

  /** values: { patientId, notes, items }. Empty notes are left out. */
  async function create(values) {
    const body = {
      patientId: Number(values.patientId),
      items: toApiItems(values.items),
    };
    const notes = String(values.notes ?? "").trim();
    if (notes) body.notes = notes;
    await api("/prescriptions", { method: "POST", body });
    await reload();
  }

  /** values: { notes, items }. Sends notes and items together (never with status). */
  async function update(id, values) {
    const body = {
      notes: String(values.notes ?? "").trim(),
      items: toApiItems(values.items),
    };
    await api("/prescriptions/" + id, { method: "PATCH", body });
    await reload();
  }

  /** Final: a cancelled prescription cannot be changed again. */
  async function cancel(id) {
    await api("/prescriptions/" + id, { method: "PATCH", body: { status: "cancelled" } });
    await reload();
  }

  return { rows, loading, error, reload, get, create, update, cancel };
}
