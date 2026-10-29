import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

const STATUS_LABEL = {
  requested: "Requested",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Backend lab request -> row shown in the table. */
export function toRow(r) {
  return {
    id: r.id,
    code: "LAB-" + r.id,
    patientId: r.patientId,
    patientName: r.patientName,
    test: r.testName,
    status: STATUS_LABEL[r.status] ?? r.status,
    rawStatus: r.status,
    created: String(r.createdAt || "").slice(0, 10),
  };
}

export function useLab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      const data = await api("/lab/requests");
      setRows(data.requests.map(toRow));
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

  /** values: { patientId, test, notes }. Empty notes are left out. */
  async function create(values) {
    const body = {
      patientId: Number(values.patientId),
      testName: String(values.test ?? "").trim(),
    };
    const notes = String(values.notes ?? "").trim();
    if (notes) body.notes = notes;
    await api("/lab/requests", { method: "POST", body });
    await reload();
  }

  async function start(id) {
    await api("/lab/requests/" + id, { method: "PATCH", body: { status: "in_progress" } });
    await reload();
  }

  async function cancel(id) {
    await api("/lab/requests/" + id, { method: "PATCH", body: { status: "cancelled" } });
    await reload();
  }

  /** values: { resultText, unit, referenceRange }. Empty unit/range are left out. */
  async function enterResult(id, values) {
    const body = { resultText: String(values.resultText ?? "").trim() };
    const unit = String(values.unit ?? "").trim();
    const range = String(values.referenceRange ?? "").trim();
    if (unit) body.unit = unit;
    if (range) body.referenceRange = range;
    await api("/lab/requests/" + id + "/result", { method: "POST", body });
    await reload();
  }

  return { rows, loading, error, reload, create, start, cancel, enterResult };
}
