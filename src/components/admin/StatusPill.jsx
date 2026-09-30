const TONES = {
  // shared
  Active: "positive",
  Paid: "positive",
  Confirmed: "positive",
  Completed: "positive",
  Ready: "positive",
  Reviewed: "positive",
  "On Duty": "positive",
  // pending / waiting
  New: "accent",
  Pending: "warning",
  "In lab": "warning",
  "Refill due": "warning",
  "On Call": "warning",
  "Awaiting sample": "warning",
  "To be assigned": "warning",
  // attention
  Critical: "danger",
  Overdue: "danger",
  Cancelled: "danger",
  Suspended: "danger",
  Stopped: "danger",
  // quiet
  Discharged: "neutral",
  "Off Duty": "neutral",
  website: "accent",
  seed: "neutral",
  staff: "neutral",
};
export function StatusPill({ value }) {
  const tone = TONES[value] ?? "neutral";
  return (<span className={`pill pill-${tone}`}>
   <span className="pill-dot" aria-hidden="true"/>
   {value}
  </span>);
}
