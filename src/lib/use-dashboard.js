import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toRow as appointmentRow, todayInNairobi } from "@/lib/use-appointments";
import { toRow as invoiceRow } from "@/lib/use-billing";

/** Counts how many rows share each label, biggest first. */
function countBy(rows, key) {
  const totals = new Map();
  rows.forEach((row) => {
    const label = key(row);
    totals.set(label, (totals.get(label) ?? 0) + 1);
  });
  return [...totals.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

/** Loads the Dashboard numbers. Invoices and feedback are administrator only. */
export function useDashboard(role) {
  const [state, setState] = useState({ data: null, error: "" });

  useEffect(() => {
    let alive = true;
    const isAdmin = role === "administrator";

    async function load() {
      try {
        const today = todayInNairobi();
        const [patients, todayList, pendingList] = await Promise.all([
          api("/patients"),
          api("/appointments?date=" + today),
          api("/appointments?status=pending"),
        ]);
        let invoices = [];
        let feedback = [];
        if (isAdmin) {
          const [inv, fb] = await Promise.all([api("/billing/invoices"), api("/feedback")]);
          invoices = inv.invoices.map(invoiceRow);
          feedback = fb.feedback;
        }
        const todays = todayList.appointments
          .map(appointmentRow)
          .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
        const pending = pendingList.appointments.map(appointmentRow);
        const unpaid = invoices.filter((i) => i.rawStatus === "issued" && i.balance > 0);
        const data = {
          today,
          patientCount: patients.patients.length,
          todays,
          pendingCount: pending.length,
          latest: [...pending].sort((a, b) => b.id - a.id).slice(0, 5),
          statusCounts: countBy(todays, (row) => row.status),
          outstanding: unpaid.reduce((sum, i) => sum + i.balance, 0),
          unpaidCount: unpaid.length,
          feedback: feedback.slice(0, 3),
        };
        if (alive) setState({ data, error: "" });
      } catch (e) {
        if (alive) setState({ data: null, error: e.message });
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [role]);

  return { ...state, loading: !state.data && !state.error };
}
