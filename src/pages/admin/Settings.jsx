import { useState } from "react";
import { usePageMeta } from "@/lib/use-page-meta";
import { Panel } from "@/components/admin/Blocks";
import { showToast } from "@/lib/toast";
import {
  DAY_KEYS,
  DAY_LABELS,
  SLOT_OPTIONS,
  checkDraft,
  useOpeningHours,
} from "@/lib/use-settings";

const pageMeta = [
  { title: "Clinic settings \u2014 SHARKS Clinic" },
  { name: "description", content: "SHARKS Clinic opening hours and appointment slots." },
  { name: "robots", content: "noindex" },
];

export default function SettingsPage() {
  usePageMeta(pageMeta);
  const { draft, setDraft, loading, error, save } = useOpeningHours();
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  function changeDay(key, patch) {
    setDraft((d) => ({ ...d, days: { ...d.days, [key]: { ...d.days[key], ...patch } } }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    const problem = checkDraft(draft);
    setFormError(problem);
    if (problem) return;
    setBusy(true);
    try {
      await save(draft);
      showToast("Opening hours saved.");
    } catch (e) {
      setFormError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-page">
      <div className="panel-grid settings-grid">
        <Panel title="Opening hours">
          {loading && <p className="panel-empty">Loading opening hours...</p>}
          {error && <p className="login-error">{error}</p>}
          {draft && (
            <form onSubmit={onSubmit}>
              <p className="panel-note">
                These hours decide which appointment times patients can book. Times are Nairobi
                time. Appointments already booked are not changed.
              </p>
              <label className="field" style={{ maxWidth: 240, marginTop: 16 }}>
                <span>Appointment slot</span>
                <select
                  value={draft.slotMinutes}
                  onChange={(e) => setDraft((d) => ({ ...d, slotMinutes: Number(e.target.value) }))}
                >
                  {SLOT_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m} minutes
                    </option>
                  ))}
                </select>
              </label>
              {DAY_KEYS.map((key) => {
                const d = draft.days[key];
                return (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 12,
                      alignItems: "flex-end",
                      marginBottom: 12,
                    }}
                  >
                    <strong style={{ width: 110, paddingBottom: 14 }}>{DAY_LABELS[key]}</strong>
                    <label className="field" style={{ margin: 0 }}>
                      <span>Opens</span>
                      <input
                        type="time"
                        value={d.open}
                        disabled={d.closed}
                        onChange={(e) => changeDay(key, { open: e.target.value })}
                      />
                    </label>
                    <label className="field" style={{ margin: 0 }}>
                      <span>Closes</span>
                      <input
                        type="time"
                        value={d.close}
                        disabled={d.closed}
                        onChange={(e) => changeDay(key, { close: e.target.value })}
                      />
                    </label>
                    <label
                      style={{ display: "flex", gap: 8, alignItems: "center", paddingBottom: 14 }}
                    >
                      <input
                        type="checkbox"
                        checked={d.closed}
                        onChange={(e) => changeDay(key, { closed: e.target.checked })}
                      />
                      Closed
                    </label>
                  </div>
                );
              })}
              {formError && <p className="login-error">{formError}</p>}
              <button type="submit" className="button button-accent" disabled={busy}>
                {busy ? "Saving..." : "Save opening hours"}
              </button>
            </form>
          )}
        </Panel>
      </div>
    </div>
  );
}
