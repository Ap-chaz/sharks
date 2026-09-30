import { usePageMeta } from "@/lib/use-page-meta";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarPlus, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { BarRow, Panel, Rating, StatCard } from "@/components/admin/Blocks";
import { StatusPill } from "@/components/admin/StatusPill";
import { getAll } from "@/lib/clinic-db";
const pageMeta = [
  { title: "Dashboard — SHARKS Clinic" },
  { name: "description", content: "SHARKS Clinic daily overview: appointments, patients and payments." },
  { name: "robots", content: "noindex" },
];
const todayISO = () => new Date().toISOString().slice(0, 10);
export default function DashboardPage() {
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
    return <div className="admin-splash">Loading overview…</div>;
  const today = todayISO();
  const todays = data.appointments
    .filter((item) => item.date === today)
    .sort((a, b) => a.time.localeCompare(b.time));
  const pending = data.appointments.filter((item) => item.status === "Pending");
  const month = today.slice(0, 7);
  const collected = data.invoices
    .filter((item) => item.status === "Paid" && item.date.startsWith(month))
    .reduce((sum, item) => sum + item.amount, 0);
  const outstanding = data.invoices
    .filter((item) => item.status !== "Paid")
    .reduce((sum, item) => sum + item.amount, 0);
  const byDepartment = countBy(data.appointments, (item) => item.department);
  const busiest = Math.max(1, ...byDepartment.map((row) => row.value));
  return (<div className="admin-page">
   <div className="stat-grid">
    <StatCard label="Patients" value={String(data.patients.length)} hint="Registered in this browser"/>
    <StatCard label="Appointments today" value={String(todays.length)} hint={today}/>
    <StatCard label="Awaiting confirmation" value={String(pending.length)} hint="From the public site and staff"/>
    <StatCard label="Collected this month" value={`${data.invoices[0] ? "KES" : "KES"} ${collected.toLocaleString("en-KE")}`} hint={`${outstanding.toLocaleString("en-KE")} outstanding`}/>
   </div>

   <div className="panel-grid">
    <Panel title="Today’s schedule" action={<Link to="/admin/appointments" className="panel-link">
       All appointments <ArrowRight size={14}/>
      </Link>}>
     {todays.length === 0 ? (<p className="panel-empty">Nothing booked for today yet.</p>) : (<ul className="mini-list">
       {todays.map((item) => (<li key={item.id}>
         <span className="mini-time">{item.time}</span>
         <span className="mini-main">
          <strong>{item.patientName}</strong>
          <small>
           {item.department} · {item.doctor}
          </small>
         </span>
         <StatusPill value={item.status}/>
        </li>))}
      </ul>)}
    </Panel>

    <Panel title="Bookings by department">
     <div className="bar-list">
      {byDepartment.map((row) => (<BarRow key={row.label} label={row.label} value={row.value} max={busiest}/>))}
     </div>
    </Panel>

    <Panel title="Latest requests" action={<Link to="/appointment" className="panel-link" target="_blank" rel="noreferrer">
       Open booking form <ArrowRight size={14}/>
      </Link>}>
     {data.appointments.slice(0, 5).map((item) => (<div key={item.id} className="mini-row">
       <span className="mini-main">
        <strong>{item.patientName}</strong>
        <small>
         {item.id} · {item.date} {item.time}
        </small>
       </span>
       <span className="mini-side">
        {item.source === "website" && <span className="badge">Website</span>}
        <StatusPill value={item.status}/>
       </span>
      </div>))}
    </Panel>

    <Panel title="Patient feedback">
     {data.feedback.slice(0, 3).map((item) => (<div key={item.id} className="feedback-row">
       <div className="feedback-top">
        <strong>{item.name}</strong>
        <Rating value={item.rating}/>
       </div>
       <p>{item.message}</p>
      </div>))}
    </Panel>
   </div>

   <div className="quick-actions">
    <Link to="/admin/appointments" className="button button-outline">
     <CalendarPlus size={16}/> Manage appointments
    </Link>
    <Link to="/admin/patients" className="button button-outline">
     <UserPlus size={16}/> Add a patient
    </Link>
    <Link to="/admin/billing" className="button button-outline">
     Record an invoice
    </Link>
   </div>
  </div>);
}
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
