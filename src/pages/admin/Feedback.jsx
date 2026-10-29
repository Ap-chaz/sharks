import { usePageMeta } from "@/lib/use-page-meta";
import { Check } from "lucide-react";
import { useState } from "react";
import { Rating } from "@/components/admin/Blocks";
import { DataTable, FilterSelect, useTable } from "@/components/admin/DataTable";
import { StatusPill } from "@/components/admin/StatusPill";
import { showToast } from "@/lib/toast";
import { useFeedback } from "@/lib/use-feedback";

const pageMeta = [
  { title: "Feedback \u2014 SHARKS Clinic" },
  { name: "description", content: "Patient feedback sent from the SHARKS Clinic website." },
  { name: "robots", content: "noindex" },
];

const SEARCH_KEYS = ["name", "message"];
const STATUSES = ["New", "Reviewed"];

export default function FeedbackPage() {
  usePageMeta(pageMeta);
  const { rows, loading, error, reload, markReviewed } = useFeedback();
  const table = useTable(rows, {
    searchKeys: SEARCH_KEYS,
    filterKey: "status",
    filterOptions: STATUSES,
    pageSize: 8,
  });
  const [busy, setBusy] = useState(false);

  async function run(action, message, tone) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      showToast(message, tone);
    } catch (e) {
      showToast(e.message, "error");
      reload();
    } finally {
      setBusy(false);
    }
  }

  const columns = [
    { key: "date", label: "Date", sortable: true, width: "130px" },
    { key: "name", label: "Name", sortable: true, width: "180px" },
    {
      key: "rating",
      label: "Rating",
      sortable: true,
      width: "150px",
      render: (row) => <Rating value={row.rating} />,
    },
    { key: "message", label: "Message" },
    {
      key: "status",
      label: "Status",
      width: "130px",
      render: (row) => <StatusPill value={row.status} />,
    },
    {
      key: "actions",
      label: "",
      width: "170px",
      align: "end",
      render: (row) =>
        row.statusKey === "new" ? (
          <span className="cell-actions">
            <button
              type="button"
              className="row-confirm"
              onClick={() => run(() => markReviewed(row.id), "Marked as reviewed.")}
            >
              <Check size={14} /> Mark reviewed
            </button>
          </span>
        ) : null,
    },
  ];

  return (
    <div className="admin-page">
      <div className="page-actions">
        <p className="page-copy">
          Feedback sent from the public website form. No email addresses are stored. Mark an entry
          as reviewed once you have read it.
        </p>
      </div>

      {error && <p className="login-error">{error}</p>}

      <DataTable
        columns={columns}
        table={table}
        emptyText={loading ? "Loading feedback..." : "No feedback yet."}
        toolbar={
          <FilterSelect
            label="Status"
            value={table.state.filter}
            options={STATUSES}
            onChange={table.setFilter}
          />
        }
      />
    </div>
  );
}
