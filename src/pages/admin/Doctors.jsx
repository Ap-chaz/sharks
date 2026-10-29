import { usePageMeta } from "@/lib/use-page-meta";
import { DataTable, FilterSelect, useTable } from "@/components/admin/DataTable";
import { StatusPill } from "@/components/admin/StatusPill";
import { useDoctors } from "@/lib/use-doctors";

const pageMeta = [
  { title: "Doctors \u2014 SHARKS Clinic" },
  { name: "description", content: "Clinical team at SHARKS Clinic." },
  { name: "robots", content: "noindex" },
];

const SEARCH_KEYS = ["name", "login"];
const STATUSES = ["Active", "Inactive"];

const columns = [
  { key: "id", label: "ID", sortable: true, width: "80px" },
  { key: "name", label: "Doctor", sortable: true },
  { key: "login", label: "Linked login", sortable: true },
  {
    key: "status",
    label: "Status",
    width: "140px",
    render: (row) => <StatusPill value={row.status} />,
  },
  { key: "defaultLabel", label: "Default", width: "110px" },
];

export default function DoctorsPage() {
  usePageMeta(pageMeta);
  const { rows, loading, error } = useDoctors();
  const table = useTable(rows, {
    searchKeys: SEARCH_KEYS,
    filterKey: "status",
    filterOptions: STATUSES,
    pageSize: 8,
  });

  return (
    <div className="admin-page">
      <div className="page-actions">
        <p className="page-copy">
          Doctors that appointments can be assigned to. This list is read-only. The default doctor
          receives all website booking requests.
        </p>
      </div>

      {error && <p className="login-error">{error}</p>}

      <DataTable
        columns={columns}
        table={table}
        emptyText={loading ? "Loading doctors..." : "No doctors yet."}
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
