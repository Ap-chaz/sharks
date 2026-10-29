import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toRow as invoiceRow } from "@/lib/use-billing";

const STATUS_LABEL = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
};

const sum = (rows, key) => rows.reduce((total, row) => total + row[key], 0);

/** Loads the Reports numbers (administrator only). */
export function useReports() {
  const [state, setState] = useState({ data: null, error: "" });

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const [summary, patients, inv] = await Promise.all([
          api("/reports/summary"),
          api("/patients"),
          api("/billing/invoices"),
        ]);
        const invoices = inv.invoices.map(invoiceRow).filter((i) => i.rawStatus === "issued");
        const a = summary.appointments;
        const data = {
          patientCount: patients.patients.length,
          appointmentTotal: a.total,
          websiteCount: a.website,
          invoiced: sum(invoices, "total"),
          collected: sum(invoices, "paid"),
          appointmentMonths: a.byMonth.map((m) => ({ label: m.month, value: m.count })),
          invoicedMonths: a.byMonth.map((m) => ({
            label: m.month,
            value: sum(
              invoices.filter((i) => i.created.startsWith(m.month)),
              "total",
            ),
          })),
          doctors: a.byDoctor.slice(0, 8).map((d) => ({ label: d.name, value: d.count })),
          outcomes: a.byStatus.map((s) => ({
            label: STATUS_LABEL[s.status] ?? s.status,
            value: s.count,
          })),
          ratings: summary.feedback.spread.map((r) => ({
            label: r.rating + " star" + (r.rating === 1 ? "" : "s"),
            value: r.count,
          })),
          reviewCount: summary.feedback.count,
          averageRating: summary.feedback.average,
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
  }, []);

  return { ...state, loading: !state.data && !state.error };
}
