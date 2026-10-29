import { usePageMeta } from "@/lib/use-page-meta";
import { BarRow, Panel, StatCard } from "@/components/admin/Blocks";
import { useReports } from "@/lib/use-reports";

const pageMeta = [
  { title: "Reports \u2014 SHARKS Clinic" },
  {
    name: "description",
    content: "SHARKS Clinic performance report: bookings, doctors, revenue and feedback.",
  },
  { name: "robots", content: "noindex" },
];

const kes = (amount) => "KES " + amount.toLocaleString("en-KE");

function BarPanel({ title, rows, empty, format }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <Panel title={title}>
      {rows.length === 0 ? (
        <p className="panel-empty">{empty}</p>
      ) : (
        <div className="bar-list">
          {rows.map((row) => (
            <BarRow
              key={row.label}
              label={row.label}
              value={row.value}
              max={max}
              display={format ? format(row.value) : undefined}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

export default function ReportsPage() {
  usePageMeta(pageMeta);
  const { data, loading, error } = useReports();

  if (error) {
    return (
      <div className="admin-page">
        <p className="login-error">{error}</p>
      </div>
    );
  }
  if (loading || !data) return <div className="admin-splash">Building report...</div>;

  return (
    <div className="admin-page">
      <div className="stat-grid">
        <StatCard
          label="Total invoiced"
          value={kes(data.invoiced)}
          hint={kes(data.collected) + " collected"}
        />
        <StatCard
          label="Appointments"
          value={String(data.appointmentTotal)}
          hint={data.websiteCount + " from the website"}
        />
        <StatCard label="Patients" value={String(data.patientCount)} hint="Active patients" />
        <StatCard
          label="Average rating"
          value={data.averageRating ? data.averageRating.toFixed(1) + " / 5" : "\u2014"}
          hint={data.reviewCount + (data.reviewCount === 1 ? " review" : " reviews")}
        />
      </div>

      <div className="panel-grid">
        <BarPanel
          title="Appointments by month"
          rows={data.appointmentMonths}
          empty="No appointments yet."
        />
        <BarPanel title="Doctor workload" rows={data.doctors} empty="No doctors yet." />
        <BarPanel
          title="Invoiced by month"
          rows={data.invoicedMonths}
          empty="No invoices yet."
          format={kes}
        />
        <BarPanel title="Appointment outcomes" rows={data.outcomes} empty="No appointments yet." />
        <BarPanel title="Feedback ratings" rows={data.ratings} empty="No feedback yet." />
      </div>
    </div>
  );
}
