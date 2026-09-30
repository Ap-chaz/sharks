import { usePageMeta } from "@/lib/use-page-meta";
import { BarRow, Panel, StatCard } from "@/components/admin/Blocks";
import { getAll, } from "@/lib/clinic-db";
import { useEffect, useState } from "react";
const pageMeta = [
  { title: "Reports — SHARKS Clinic" },
  { name: "description", content: "SHARKS Clinic performance report: bookings, departments, revenue and feedback." },
  { name: "robots", content: "noindex" },
];
export default function ReportsPage() {
  usePageMeta(pageMeta);
  const [data, setData] = useState(null);
  useEffect(() => {
    setData({
      patients: getAll("patients"),
      appointments: getAll("appointments"),
      invoices: getAll("invoices"),
      feedback: getAll("feedback"),
    });
  }, []);
  if (!data)
    return <div className="admin-splash">Building report…</div>;
  const departments = topCount(data.appointments, (row) => row.department);
  const doctorsByLoad = topCount(data.appointments, (row) => row.doctor);
  const statuses = topCount(data.appointments, (row) => row.status);
  const revenue = data.invoices.reduce((sum, row) => sum + row.amount, 0);
  const paid = data.invoices.filter((row) => row.status === "Paid").reduce((sum, row) => sum + row.amount, 0);
  const avgRating = data.feedback.length
    ? data.feedback.reduce((sum, row) => sum + row.rating, 0) / data.feedback.length
    : 0;
  const ratingSpread = [5, 4, 3, 2, 1].map((stars) => ({
    label: `${stars} star${stars === 1 ? "" : "s"}`,
    value: data.feedback.filter((row) => row.rating === stars).length,
  }));
  const months = monthKeys(4).map((key) => ({
    label: key,
    value: data.invoices.filter((row) => row.date.startsWith(key)).reduce((sum, row) => sum + row.amount, 0),
  }));
  const maxDept = Math.max(1, ...departments.map((row) => row.value));
  const maxDoctor = Math.max(1, ...doctorsByLoad.map((row) => row.value));
  const maxMonth = Math.max(1, ...months.map((row) => row.value));
  const maxRating = Math.max(1, ...ratingSpread.map((row) => row.value));
  return (<div className="admin-page">
   <div className="stat-grid">
    <StatCard label="Total revenue" value={`KES ${revenue.toLocaleString("en-KE")}`} hint={`${paid.toLocaleString("en-KE")} collected`}/>
    <StatCard label="Appointments" value={String(data.appointments.length)} hint={`${data.appointments.filter((row) => row.source === "website").length} from the website`}/>
    <StatCard label="Patients" value={String(data.patients.length)} hint="Registered records"/>
    <StatCard label="Average rating" value={avgRating ? `${avgRating.toFixed(1)} / 5` : "—"} hint={`${data.feedback.length} reviews`}/>
   </div>

   <div className="panel-grid">
    <Panel title="Bookings by department">
     <div className="bar-list">
      {departments.map((row) => (<BarRow key={row.label} label={row.label} value={row.value} max={maxDept}/>))}
     </div>
    </Panel>

    <Panel title="Doctor workload">
     <div className="bar-list">
      {doctorsByLoad.map((row) => (<BarRow key={row.label} label={row.label} value={row.value} max={maxDoctor}/>))}
     </div>
    </Panel>

    <Panel title="Revenue by month">
     <div className="bar-list">
      {months.map((row) => (<BarRow key={row.label} label={row.label} value={row.value} max={maxMonth} display={`KES ${row.value.toLocaleString("en-KE")}`}/>))}
     </div>
    </Panel>

    <Panel title="Appointment outcomes">
     <div className="bar-list">
      {statuses.map((row) => (<BarRow key={row.label} label={row.label} value={row.value} max={maxDept}/>))}
     </div>
    </Panel>

    <Panel title="Feedback ratings">
     <div className="bar-list">
      {ratingSpread.map((row) => (<BarRow key={row.label} label={row.label} value={row.value} max={maxRating}/>))}
     </div>
    </Panel>
   </div>
  </div>);
}
function topCount(rows, key) {
  const totals = new Map();
  rows.forEach((row) => {
    const label = key(row);
    totals.set(label, (totals.get(label) ?? 0) + 1);
  });
  return [...totals.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}
function monthKeys(count) {
  const keys = [];
  const now = new Date();
  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    keys.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}
