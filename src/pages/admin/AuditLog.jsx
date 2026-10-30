import { usePageMeta } from "@/lib/use-page-meta";
import { DataTable, useTable } from "@/components/admin/DataTable";
import { useAudit } from "@/lib/use-audit";

const pageMeta = [
  { title: "Activity log \u2014 SHARKS Clinic" },
  { name: "description", content: "Who did what in the SHARKS Clinic dashboard." },
  { name: "robots", content: "noindex" },
];

const SEARCH_KEYS = ["username", "action", "record", "ipAddress"];

export default function AuditLogPage() {
  usePageMeta(pageMeta);
  const { rows, loading, error } = useAudit();
  const table = useTable(rows, { searchKeys: SEARCH_KEYS, pageSize: 10 });

  const columns = [
    { key: "when", label: "When (Nairobi)", width: "170px" },
    { key: "username", label: "User", sortable: true, width: "170px" },
    { key: "action", label: "Action", sortable: true },
    { key: "record", label: "Record" },
    { key: "ipAddress", label: "IP address", width: "160px" },
  ];

  return (
    <div className="admin-page">
      <div className="page-actions">
        <p className="page-copy">
          The latest 200 actions in the dashboard, newest first. Only administrators can see this
          page. Record contents are not shown here.
        </p>
      </div>

      {error && <p className="login-error">{error}</p>}

      <DataTable
        columns={columns}
        table={table}
        emptyText={loading ? "Loading activity..." : "No activity yet."}
      />
    </div>
  );
}
