import { usePageMeta } from "@/lib/use-page-meta";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarPlus, UserPlus } from "lucide-react";
import { BarRow, Panel, Rating, StatCard } from "@/components/admin/Blocks";
import { StatusPill } from "@/components/admin/StatusPill";
import { useAdminUser } from "@/lib/admin-user";
import { useDashboard } from "@/lib/use-dashboard";

const pageMeta = [
  { title: "Dashboard \u2014 SHARKS Clinic" },
  {
    name: "description",
    content: "SHARKS Clinic daily overview: appointments, patients and payments.",
  },
  { name: "robots", content: "noindex" },
];

export default function DashboardPage() {
  usePageMeta(pageMeta);
  const user = useAdminUser();
  const isAdmin = user?.role === "administrator";
  const { data, loading, error } = useDashboard(user?.role);

  if (error) {
    return (
      <div className="admin-page">
        <p className="login-error">{error}</p>
      </div>
    );
  }
  if (loading || !data) return <div className="admin-splash">Loading overview...</div>;

  const busiest = Math.max(1, ...data.statusCounts.map((row) => row.value));

  return (
    <div className="admin-page">
      <div className="stat-grid">
        <StatCard label="Patients" value={String(data.patientCount)} hint="Active patients" />
        <StatCard label="Appointments today" value={String(data.todays.length)} hint={data.today} />
        <StatCard
          label="Awaiting confirmation"
          value={String(data.pendingCount)}
          hint="From the public site and staff"
        />
        {isAdmin && (
          <StatCard
            label="Outstanding balance"
            value={"KES " + data.outstanding.toLocaleString("en-KE")}
            hint={data.unpaidCount + " unpaid invoice(s)"}
          />
        )}
      </div>

      <div className="panel-grid">
        <Panel
          title="Today&rsquo;s schedule"
          action={
            <Link to="/admin/appointments" className="panel-link">
              All appointments <ArrowRight size={14} />
            </Link>
          }
        >
          {data.todays.length === 0 ? (
            <p className="panel-empty">Nothing booked for today yet.</p>
          ) : (
            <ul className="mini-list">
              {data.todays.map((item) => (
                <li key={item.id}>
                  <span className="mini-time">{item.time}</span>
                  <span className="mini-main">
                    <strong>{item.patientName}</strong>
                    <small>{[item.department, item.doctor].filter(Boolean).join(" \u00b7 ")}</small>
                  </span>
                  <StatusPill value={item.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Today by status">
          {data.statusCounts.length === 0 ? (
            <p className="panel-empty">No appointments today.</p>
          ) : (
            <div className="bar-list">
              {data.statusCounts.map((row) => (
                <BarRow key={row.label} label={row.label} value={row.value} max={busiest} />
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="Latest requests"
          action={
            <Link to="/admin/appointments" className="panel-link">
              Open appointments <ArrowRight size={14} />
            </Link>
          }
        >
          {data.latest.length === 0 ? (
            <p className="panel-empty">No requests waiting.</p>
          ) : (
            data.latest.map((item) => (
              <div key={item.id} className="mini-row">
                <span className="mini-main">
                  <strong>{item.patientName}</strong>
                  <small>
                    {item.code} {"\u00b7"} {item.date} {item.time}
                  </small>
                </span>
                <span className="mini-side">
                  {item.source === "website" && <span className="badge">Website</span>}
                  <StatusPill value={item.status} />
                </span>
              </div>
            ))
          )}
        </Panel>

        {isAdmin && (
          <Panel title="Patient feedback">
            {data.feedback.length === 0 ? (
              <p className="panel-empty">No feedback yet.</p>
            ) : (
              data.feedback.map((item) => (
                <div key={item.id} className="feedback-row">
                  <div className="feedback-top">
                    <strong>{item.name || "Anonymous"}</strong>
                    <Rating value={item.rating} />
                  </div>
                  <p>{item.message}</p>
                </div>
              ))
            )}
          </Panel>
        )}
      </div>

      <div className="quick-actions">
        <Link to="/admin/appointments" className="button button-outline">
          <CalendarPlus size={16} /> Manage appointments
        </Link>
        <Link to="/admin/patients" className="button button-outline">
          <UserPlus size={16} /> Add a patient
        </Link>
        {isAdmin && (
          <Link to="/admin/billing" className="button button-outline">
            Record an invoice
          </Link>
        )}
      </div>
    </div>
  );
}
