import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const DAY_LABELS = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};
export const SLOT_OPTIONS = [15, 30, 45, 60];

function toMinutes(hhmm) {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + m;
}

/** Backend hours -> editable draft (closed days keep default times). */
export function toDraft(hours) {
  const days = {};
  for (const key of DAY_KEYS) {
    const d = hours.days?.[key];
    days[key] = d
      ? { closed: false, open: d.open, close: d.close }
      : { closed: true, open: "08:00", close: "20:00" };
  }
  return { slotMinutes: hours.slotMinutes, days };
}

/** Editable draft -> backend body. */
export function toBody(draft) {
  const days = {};
  for (const key of DAY_KEYS) {
    const d = draft.days[key];
    days[key] = d.closed ? null : { open: d.open, close: d.close };
  }
  return { slotMinutes: Number(draft.slotMinutes), days };
}

/** Returns an error message, or "" when the draft is fine. */
export function checkDraft(draft) {
  const slot = Number(draft.slotMinutes);
  for (const key of DAY_KEYS) {
    const d = draft.days[key];
    if (d.closed) continue;
    if (!d.open || !d.close) return DAY_LABELS[key] + ": enter both times.";
    if (toMinutes(d.close) - toMinutes(d.open) < slot) {
      return DAY_LABELS[key] + ": closing time must be at least one slot after opening.";
    }
  }
  return "";
}

export function useOpeningHours() {
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      const data = await api("/settings/opening-hours");
      setDraft(toDraft(data));
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

  async function save(next) {
    const data = await api("/settings/opening-hours", { method: "PATCH", body: toBody(next) });
    setDraft(toDraft(data));
  }

  return { draft, setDraft, loading, error, reload, save };
}
