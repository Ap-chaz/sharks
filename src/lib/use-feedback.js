import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

const STATUS_LABEL = { new: "New", reviewed: "Reviewed" };

const nairobiDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Nairobi",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** A UTC timestamp from the server -> Nairobi date as YYYY-MM-DD. */
function toDay(value) {
  if (!value) return "";
  let text = String(value);
  if (/^\d{4}-\d{2}-\d{2} /.test(text)) text = text.replace(" ", "T") + "Z";
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? text.slice(0, 10) : nairobiDay.format(date);
}

/** Backend feedback -> row shown in the table. */
export function toRow(f) {
  return {
    id: f.id,
    name: f.name || "Anonymous",
    rating: f.rating,
    message: f.message,
    status: STATUS_LABEL[f.status] ?? f.status,
    statusKey: f.status,
    date: toDay(f.createdAt),
    reviewedDate: toDay(f.reviewedAt),
  };
}

export function useFeedback() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      const data = await api("/feedback");
      setRows(data.feedback.map(toRow));
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

  /** New -> Reviewed. The backend answers 409 if it was already reviewed. */
  async function markReviewed(id) {
    await api("/feedback/" + id, { method: "PATCH", body: { status: "reviewed" } });
    await reload();
  }

  return { rows, loading, error, reload, markReviewed };
}
