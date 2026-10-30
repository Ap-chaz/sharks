import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

const STATUS_LABEL = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
};

/** Today's date in Nairobi as YYYY-MM-DD. */
export function todayInNairobi() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Move a YYYY-MM-DD date by a number of days. */
export function shiftDate(date, days) {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function time12(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return String(h % 12 || 12).padStart(2, "0") + ":" + String(m).padStart(2, "0") + " " + suffix;
}

/** Public bookings store "Department: X | Email: Y | Reason: Z" in notes. */
function parseNotes(notes) {
  if (!notes) return { department: "", email: "", reason: "" };
  const m = /^Department: (.*?)(?: \| Email: (.*?))? \| Reason: (.*)$/s.exec(notes);
  if (!m) return { department: "", email: "", reason: notes };
  return { department: m[1], email: m[2] || "", reason: m[3] };
}

/** Backend appointment -> row shown in the table. */
export function toRow(a) {
  const { department, email, reason } = parseNotes(a.notes);
  return {
    id: a.id,
    code: "A-" + a.id,
    patientName: a.patientName || "Unknown",
    patientCode: a.patientCode || "",
    phone: a.phone || "",
    email,
    department,
    reason,
    doctor: a.doctorName || "Doctor #" + a.doctorId,
    date: a.date,
    time: time12(a.time),
    sortKey: a.date + " " + a.time,
    status: STATUS_LABEL[a.status] || a.status,
    statusKey: a.status,
    source: a.patientId ? "staff" : "website",
  };
}

export function useAppointments() {
  const [view, setView] = useState("day");
  const [date, setDate] = useState(todayInNairobi);
  const [result, setResult] = useState({ key: "", rows: [], error: "" });
  const latest = useRef(0);
  const key = view === "pending" ? "pending" : date;
  const loading = result.key !== key;

  const reload = useCallback(async () => {
    const mine = ++latest.current;
    const path = view === "pending" ? "/appointments?status=pending" : "/appointments?date=" + date;
    try {
      const data = await api(path);
      if (mine === latest.current) {
        setResult({ key, rows: data.appointments.map(toRow), error: "" });
      }
    } catch (e) {
      if (mine === latest.current) setResult({ key, rows: [], error: e.message });
    }
  }, [view, date, key]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function setStatus(id, statusKey) {
    await api("/appointments/" + id, { method: "PATCH", body: { status: statusKey } });
    await reload();
  }

  return {
    view,
    setView,
    date,
    setDate,
    rows: loading ? [] : result.rows,
    loading,
    error: result.error,
    reload,
    setStatus,
  };
}
