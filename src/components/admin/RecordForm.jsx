import { useMemo, useState } from "react";
/**
 * Declarative create/edit form. Values are collected as strings and
 * converted back to their record types on submit.
 */
export function RecordForm({ fields, initial, submitLabel, onSubmit, onCancel, }) {
  const start = useMemo(() => {
    const values = {};
    fields.forEach((field) => {
      const raw = initial ? initial[field.name] : undefined;
      values[field.name] = raw === undefined || raw === null ? "" : String(raw);
    });
    return values;
  }, [fields, initial]);
  const [values, setValues] = useState(start);
  const [errors, setErrors] = useState({});
  function submit(event) {
    event.preventDefault();
    const nextErrors = {};
    const patch = {};
    fields.forEach((field) => {
      const raw = (values[field.name] ?? "").trim();
      if (field.required && !raw) {
        nextErrors[field.name] = "This field is required.";
        return;
      }
      if (field.type === "number") {
        const parsed = Number(raw);
        if (raw && !Number.isFinite(parsed)) {
          nextErrors[field.name] = "Enter a number.";
          return;
        }
        patch[field.name] = parsed;
        return;
      }
      if (field.type === "email" && raw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
        nextErrors[field.name] = "Enter a valid email address.";
        return;
      }
      patch[field.name] = raw;
    });
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    onSubmit(patch);
  }
  return (<form className="record-form" onSubmit={submit} noValidate>
   <div className="record-grid">
    {fields.map((field) => {
      const type = field.type ?? "text";
      const error = errors[field.name];
      return (<label key={field.name} className={`field record-field ${error ? "field-invalid" : ""} ${field.full ? "span-2" : ""}`}>
       <span>{field.label}</span>
       {type === "select" ? (<select name={field.name} value={values[field.name] ?? ""} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}>
         <option value="">Select {field.label.toLowerCase()}</option>
         {(field.options ?? []).map((option) => (<option key={option} value={option}>
           {option}
          </option>))}
        </select>) : type === "textarea" ? (<textarea name={field.name} rows={4} value={values[field.name] ?? ""} placeholder={field.placeholder ?? ""} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}/>) : (<input name={field.name} type={type} value={values[field.name] ?? ""} placeholder={field.placeholder ?? ""} onChange={(event) => setValues({ ...values, [field.name]: event.target.value })}/>)}
       {error && <small>{error}</small>}
      </label>);
    })}
   </div>
   <div className="modal-actions">
    {onCancel && (<button type="button" className="button button-outline" onClick={onCancel}>
      Cancel
     </button>)}
    <button type="submit" className="button button-accent">
     {submitLabel}
    </button>
   </div>
  </form>);
}
