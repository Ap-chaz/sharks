import { Pencil, Trash2 } from "lucide-react";
export function StatCard({ label, value, hint }) {
  return (<div className="stat-card">
   <span className="stat-label">{label}</span>
   <strong className="stat-value">{value}</strong>
   {hint && <small className="stat-hint">{hint}</small>}
  </div>);
}
export function Panel({ title, action, children, className = "", }) {
  return (<section className={`panel ${className}`}>
   <div className="panel-head">
    <h2>{title}</h2>
    {action}
   </div>
   <div className="panel-body">{children}</div>
  </section>);
}
export function RowActions({ onEdit, onDelete }) {
  return (<div className="row-actions">
   <button type="button" onClick={onEdit} aria-label="Edit record">
    <Pencil size={14}/>
   </button>
   <button type="button" className="row-actions-danger" onClick={onDelete} aria-label="Delete record">
    <Trash2 size={14}/>
   </button>
  </div>);
}
export function BarRow({ label, value, max, display }) {
  const width = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (<div className="bar-row">
   <span className="bar-label">{label}</span>
   <span className="bar-track">
    <span className="bar-fill" style={{ width: `${width}%` }}/>
   </span>
   <span className="bar-value">{display ?? String(value)}</span>
  </div>);
}
export function Rating({ value }) {
  const shown = Math.min(5, Math.max(0, value));
  return (<span className="rating-row" aria-label={`${value} out of 5`}>
   <span className="rating">
    <span className="rating-fill" style={{ width: `${(shown / 5) * 100}%` }}/>
   </span>
   <small className="rating-value">{shown}/5</small>
  </span>);
}
export function Money({ amount, currency }) {
  return (<span className="money">
   {currency} {amount.toLocaleString("en-KE")}
  </span>);
}
