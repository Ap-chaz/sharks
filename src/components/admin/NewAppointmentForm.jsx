import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { todayInNairobi } from "@/lib/use-appointments";
import { usePatients } from "@/lib/use-patients";

/** Form for staff to book a confirmed appointment for an existing patient. */
export function NewAppointmentForm({ onSaved, onCancel }) {
  const { rows, loading, error: loadError } = usePatients();
  const patients = rows.filter((p) => p.status === "Active");
  const [patientId, setPatientId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [slots, setSlots] = useState([]);
  const [slotsNote, setSlotsNote] = useState("Choose a date first");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!date) return undefined;
    let live = true;
    api("/appointments/slots?date=" + date).then(
      (r) => {
        if (!live) return;
        setSlots(r.slots);
        setSlotsNote(r.slots.length ? "Select time" : "No times available that day");
      },
      (e) => {
        if (!live) return;
        setSlots([]);
        setSlotsNote(e.message);
      },
    );
    return () => {
      live = false;
    };
  }, [date]);

  function changeDate(value) {
    setDate(value);
    setTime("");
    setSlots([]);
    setSlotsNote(value ? "Loading times..." : "Choose a date first");
  }

  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    const next = {};
    if (!patientId) next.patient = "Choose a patient.";
    if (!date) next.date = "Choose a date.";
    if (!time) next.time = "Choose a time.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      await api("/appointments", {
        method: "POST",
        body: { patientId: Number(patientId), date, time, notes: notes.trim() || null },
      });
      showToast("Appointment booked.");
      onSaved(date);
    } catch (e) {
      setErrors({ form: e.message });
      setSaving(false);
    }
  }

  return (
    <form className="record-form" onSubmit={submit} noValidate>
      <div className="record-grid">
        <label className={`field record-field span-2 ${errors.patient ? "field-invalid" : ""}`}>
          <span>Patient</span>
          <select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
            <option value="">{loading ? "Loading patients..." : "Select patient"}</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} {p.name}
              </option>
            ))}
          </select>
          {errors.patient && <small>{errors.patient}</small>}
          {!loading && !loadError && patients.length === 0 && (
            <small>No active patients yet. Add the patient on the Patients page first.</small>
          )}
          {loadError && <small>{loadError}</small>}
        </label>
        <label className={`field record-field ${errors.date ? "field-invalid" : ""}`}>
          <span>Date</span>
          <input
            type="date"
            value={date}
            min={todayInNairobi()}
            onChange={(e) => changeDate(e.target.value)}
          />
          {errors.date && <small>{errors.date}</small>}
        </label>
        <label className={`field record-field ${errors.time ? "field-invalid" : ""}`}>
          <span>Time</span>
          <select value={time} onChange={(e) => setTime(e.target.value)}>
            <option value="">{slotsNote}</option>
            {slots.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {errors.time && <small>{errors.time}</small>}
        </label>
        <label className="field record-field span-2">
          <span>Notes (optional)</span>
          <textarea
            rows={3}
            maxLength={500}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
      </div>
      {errors.form && <p className="login-error">{errors.form}</p>}
      <div className="modal-actions">
        <button type="button" className="button button-outline" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button button-accent">
          Book appointment
        </button>
      </div>
    </form>
  );
}
