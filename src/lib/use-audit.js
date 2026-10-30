import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

const nairobiTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Africa/Nairobi",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** A UTC timestamp from the server -> Nairobi date and time. */
function toWhen(value) {
  if (!value) return "";
  let text = String(value);
  if (/^\d{4}-\d{2}-\d{2} /.test(text)) text = text.replace(" ", "T") + "Z";
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? text : nairobiTime.format(date);
}

/** Backend audit entry -> row shown in the table. */
export function toRow(e) {
  return {
    id: e.id,
    when: toWhen(e.createdAt),
    username: e.username || "-",
    action: e.action,
    record: e.entityType ? e.entityType + (e.entityId ? " " + e.entityId : "") : "-",
    ipAddress: e.ipAddress || "-",
  };
}

export function useAudit() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      const data = await api("/audit");
      setRows(data.entries.map(toRow));
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

  return { rows, loading, error, reload };
}
