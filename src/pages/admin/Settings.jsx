import { usePageMeta } from "@/lib/use-page-meta";
import { ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Panel } from "@/components/admin/Blocks";
import { Modal } from "@/components/admin/Modal";
import { RecordForm } from "@/components/admin/RecordForm";
import { DEMO_CREDENTIALS, resetDemoData } from "@/lib/clinic-db";
import { showToast } from "@/lib/toast";
import { useSettings } from "@/lib/use-clinic-data";
const pageMeta = [
  { title: "Clinic settings — SHARKS Clinic" },
  { name: "description", content: "SHARKS Clinic profile, contact details and demo data controls." },
  { name: "robots", content: "noindex" },
];
const FIELDS = [
  { name: "clinicName", label: "Clinic name", required: true },
  { name: "tagline", label: "Tagline", required: true },
  { name: "phone", label: "Public phone", required: true },
  { name: "email", label: "Public email", type: "email", required: true },
  { name: "address", label: "Location", required: true },
  { name: "hours", label: "Opening hours", required: true },
  { name: "currency", label: "Currency", required: true, placeholder: "KES" },
  { name: "appointmentSlotMinutes", label: "Appointment slot (minutes)", type: "number", required: true },
];
export default function SettingsPage() {
  usePageMeta(pageMeta);
  const { settings, save } = useSettings();
  const [restoreOpen, setRestoreOpen] = useState(false);
  return (<div className="admin-page">
   <div className="panel-grid settings-grid">
    <Panel title="Clinic profile">
     {settings ? (<RecordForm fields={FIELDS} initial={settings} submitLabel="Save changes" onSubmit={(values) => {
        save(values);
        showToast("Clinic profile saved.");
      }}/>) : (<p className="panel-empty">Loading clinic profile…</p>)}
    </Panel>

    <Panel title="Sign in">
     <p className="panel-note">
      The dashboard currently uses a single demo login: <strong>{DEMO_CREDENTIALS.username}</strong> /{" "}
      <strong>{DEMO_CREDENTIALS.password}</strong>. It is checked in the browser, so it is not real protection —
      anyone who knows the password can open this dashboard.
     </p>
     <p className="panel-note">
      Staff accounts listed under <strong>Staff management</strong> are a roster only: they do not sign in, and
      their roles do not restrict what they can see.
     </p>
     <p className="login-warning settings-warning">
      <ShieldAlert size={15}/>
      Before real patient information is stored here, the dashboard needs a real login and a database that works
      across devices.
     </p>
    </Panel>

    <Panel title="Demo data">
     <p className="panel-note">
      Everything on this dashboard is saved in this browser only. A booking made on a patient’s phone does not
      appear here, and clearing the browser’s site data resets the clinic to the sample records.
     </p>
     <button type="button" className="button button-outline" onClick={() => setRestoreOpen(true)}>
      Restore sample data
     </button>
    </Panel>
   </div>

   <Modal open={restoreOpen} title="Restore sample data" onClose={() => setRestoreOpen(false)}>
    <p className="confirm-copy">
     This replaces every patient, appointment, invoice, lab test, prescription and staff record with the original
     sample set. Anything you added here is discarded.
    </p>
    <div className="modal-actions">
     <button type="button" className="button button-outline" onClick={() => setRestoreOpen(false)}>
      Cancel
     </button>
     <button type="button" className="button button-danger" onClick={() => {
      resetDemoData();
      setRestoreOpen(false);
      showToast("Sample data restored.", "info");
    }}>
      Restore sample data
     </button>
    </div>
   </Modal>
  </div>);
}
