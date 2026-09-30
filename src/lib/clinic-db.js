/* ============================================================
  SHARKS Clinic — shared browser data layer
  ------------------------------------------------------------
  The public site and the staff dashboard are two front ends for
  the same data. Both read and write through this module, which
  persists one JSON object in the browser under STORAGE_KEY.

  Browser-only: this module reads and writes window.localStorage.
  Call it from event handlers or effects.
  ============================================================ */
export const STORAGE_KEY = "sharksClinicDB";
/** Demo credentials. This login is simulated: it exists to
 *  demonstrate the dashboard, and is not real protection. */
export const DEMO_CREDENTIALS = { username: "admin", password: "sharks123" };
const today = () => new Date().toISOString().slice(0, 10);
const dayOffset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
function seed() {
  return {
    version: 1,
    auth: { loggedIn: false, username: "" },
    patients: [
      { id: "P-1001", name: "John Doe", phone: "0712 345 678", email: "john.doe@example.com", age: 32, gender: "Male", lastVisit: dayOffset(-2), status: "Active" },
      { id: "P-1002", name: "Mary Wanjiku", phone: "0722 456 789", email: "mary.w@example.com", age: 28, gender: "Female", lastVisit: dayOffset(-3), status: "Active" },
      { id: "P-1003", name: "Peter Mwangi", phone: "0733 567 890", email: "peter.m@example.com", age: 45, gender: "Male", lastVisit: dayOffset(-5), status: "Active" },
      { id: "P-1004", name: "Grace Akinyi", phone: "0744 678 901", email: "grace.a@example.com", age: 34, gender: "Female", lastVisit: dayOffset(-1), status: "New" },
      { id: "P-1005", name: "James Ochieng", phone: "0755 789 012", email: "james.o@example.com", age: 50, gender: "Male", lastVisit: dayOffset(-8), status: "Critical" },
      { id: "P-1006", name: "Aisha Mohamed", phone: "0766 890 123", email: "aisha.m@example.com", age: 39, gender: "Female", lastVisit: dayOffset(-11), status: "Active" },
      { id: "P-1007", name: "Kevin Otieno", phone: "0777 123 456", email: "kevin.o@example.com", age: 24, gender: "Male", lastVisit: dayOffset(-15), status: "Discharged" },
    ],
    doctors: [
      { id: "D-001", name: "Dr. Jane Smith", specialty: "General Medicine", phone: "0700 111 222", email: "jane.smith@sharksclinic.com", status: "On Duty" },
      { id: "D-002", name: "Dr. Michael Brown", specialty: "Cardiology", phone: "0700 222 333", email: "michael.brown@sharksclinic.com", status: "On Duty" },
      { id: "D-003", name: "Dr. Sarah Wilson", specialty: "Pediatrics", phone: "0700 333 444", email: "sarah.wilson@sharksclinic.com", status: "On Call" },
      { id: "D-004", name: "Dr. Peter Otieno", specialty: "Surgery", phone: "0700 444 555", email: "peter.otieno@sharksclinic.com", status: "Off Duty" },
      { id: "D-005", name: "Dr. Mercy Waweru", specialty: "Dermatology", phone: "0700 555 666", email: "mercy.waweru@sharksclinic.com", status: "On Duty" },
    ],
    appointments: [
      { id: "A-2001", patientName: "John Doe", phone: "0712 345 678", email: "john.doe@example.com", doctor: "Dr. Jane Smith", department: "General Consultation", date: today(), time: "09:00 AM", reason: "Routine check-up", status: "Confirmed", source: "seed" },
      { id: "A-2002", patientName: "Mary Wanjiku", phone: "0722 456 789", email: "mary.w@example.com", doctor: "Dr. Sarah Wilson", department: "Pediatrics", date: today(), time: "10:30 AM", reason: "Child immunisation review", status: "Pending", source: "seed" },
      { id: "A-2003", patientName: "Aisha Mohamed", phone: "0766 890 123", email: "aisha.m@example.com", doctor: "Dr. Michael Brown", department: "Cardiology", date: today(), time: "02:00 PM", reason: "Blood pressure follow-up", status: "Confirmed", source: "seed" },
      { id: "A-2004", patientName: "Peter Mwangi", phone: "0733 567 890", email: "peter.m@example.com", doctor: "Dr. Jane Smith", department: "Laboratory", date: dayOffset(1), time: "08:00 AM", reason: "Full blood count", status: "Pending", source: "seed" },
      { id: "A-2005", patientName: "Grace Akinyi", phone: "0744 678 901", email: "grace.a@example.com", doctor: "Dr. Mercy Waweru", department: "Dermatology", date: dayOffset(2), time: "11:00 AM", reason: "Eczema assessment", status: "Confirmed", source: "seed" },
      { id: "A-2006", patientName: "James Ochieng", phone: "0755 789 012", email: "james.o@example.com", doctor: "Dr. Peter Otieno", department: "Orthopedics", date: dayOffset(-3), time: "03:00 PM", reason: "Knee pain review", status: "Completed", source: "seed" },
      { id: "A-2007", patientName: "Kevin Otieno", phone: "0777 123 456", email: "kevin.o@example.com", doctor: "Dr. Jane Smith", department: "General Consultation", date: dayOffset(-6), time: "09:30 AM", reason: "Flu symptoms", status: "Cancelled", source: "seed" },
    ],
    invoices: [
      { id: "INV-3001", patientName: "John Doe", service: "General Consultation", amount: 2500, date: dayOffset(-2), method: "M-Pesa", status: "Paid" },
      { id: "INV-3002", patientName: "Mary Wanjiku", service: "Pediatrics", amount: 3200, date: dayOffset(-3), method: "Insurance", status: "Pending" },
      { id: "INV-3003", patientName: "Aisha Mohamed", service: "Cardiology", amount: 6800, date: dayOffset(-5), method: "Card", status: "Paid" },
      { id: "INV-3004", patientName: "James Ochieng", service: "Orthopedics", amount: 9400, date: dayOffset(-9), method: "Cash", status: "Overdue" },
      { id: "INV-3005", patientName: "Peter Mwangi", service: "Laboratory Services", amount: 4100, date: dayOffset(-1), method: "M-Pesa", status: "Paid" },
      { id: "INV-3006", patientName: "Grace Akinyi", service: "Dermatology", amount: 5500, date: dayOffset(-12), method: "Insurance", status: "Pending" },
    ],
    labTests: [
      { id: "LAB-4001", patientName: "Peter Mwangi", test: "Full blood count", requestedBy: "Dr. Jane Smith", sampleDate: dayOffset(-1), status: "Ready" },
      { id: "LAB-4002", patientName: "Aisha Mohamed", test: "Lipid profile", requestedBy: "Dr. Michael Brown", sampleDate: dayOffset(-2), status: "Reviewed" },
      { id: "LAB-4003", patientName: "John Doe", test: "Blood glucose", requestedBy: "Dr. Jane Smith", sampleDate: dayOffset(0), status: "In lab" },
      { id: "LAB-4004", patientName: "Grace Akinyi", test: "Skin patch test", requestedBy: "Dr. Mercy Waweru", sampleDate: dayOffset(1), status: "Awaiting sample" },
      { id: "LAB-4005", patientName: "James Ochieng", test: "X-ray — knee", requestedBy: "Dr. Peter Otieno", sampleDate: dayOffset(-4), status: "Reviewed" },
    ],
    prescriptions: [
      { id: "RX-5001", patientName: "John Doe", medication: "Amoxicillin", dosage: "500mg, 3x daily, 7 days", doctor: "Dr. Jane Smith", issued: dayOffset(-2), status: "Active" },
      { id: "RX-5002", patientName: "Aisha Mohamed", medication: "Amlodipine", dosage: "5mg, once daily", doctor: "Dr. Michael Brown", issued: dayOffset(-5), status: "Refill due" },
      { id: "RX-5003", patientName: "Mary Wanjiku", medication: "Paracetamol syrup", dosage: "5ml, 3x daily", doctor: "Dr. Sarah Wilson", issued: dayOffset(-3), status: "Active" },
      { id: "RX-5004", patientName: "James Ochieng", medication: "Diclofenac gel", dosage: "Apply 2x daily", doctor: "Dr. Peter Otieno", issued: dayOffset(-9), status: "Stopped" },
    ],
    staff: [
      { id: "S-001", name: "Dr. Jane Smith", role: "Administrator", email: "jane.smith@sharksclinic.com", phone: "0700 111 222", status: "Active" },
      { id: "S-002", name: "Winnie Achieng", role: "Receptionist", email: "winnie@sharksclinic.com", phone: "0711 222 333", status: "Active" },
      { id: "S-003", name: "Samuel Kiptoo", role: "Nurse", email: "samuel@sharksclinic.com", phone: "0722 333 444", status: "Active" },
      { id: "S-004", name: "Lucy Njeri", role: "Lab Technician", email: "lucy@sharksclinic.com", phone: "0733 444 555", status: "Active" },
      { id: "S-005", name: "Brian Omondi", role: "Pharmacist", email: "brian@sharksclinic.com", phone: "0744 555 666", status: "Suspended" },
    ],
    feedback: [
      { id: "F-6001", name: "Grace Akinyi", email: "grace.a@example.com", rating: 5, message: "The team explained everything clearly and I never felt rushed.", date: dayOffset(-2) },
      { id: "F-6002", name: "Peter Mwangi", email: "peter.m@example.com", rating: 4, message: "Lab results came back quickly. Waiting area was busy in the morning.", date: dayOffset(-6) },
    ],
    settings: {
      clinicName: "SHARKS Clinic",
      tagline: "Your health. Our priority.",
      phone: "+254 722 405 988",
      email: "hello@sharksclinic.com",
      address: "Nairobi, Kenya",
      hours: "Mon – Sat, 8:00 AM – 6:00 PM",
      currency: "KES",
      appointmentSlotMinutes: 30,
    },
  };
}
function isBrowser() {
  return typeof window !== "undefined";
}
function write(db) {
  if (!isBrowser())
    return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }
  catch {
    /* storage unavailable (private mode, quota) — keep working in memory */
  }
}
/** Reads the clinic database, creating seed data on first use. */
export function loadDB() {
  const fresh = seed();
  if (!isBrowser())
    return fresh;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      write(fresh);
      return fresh;
    }
    const saved = JSON.parse(raw);
    const merged = {
      ...fresh,
      ...saved,
      auth: { ...fresh.auth, ...saved.auth },
      settings: { ...fresh.settings, ...saved.settings },
    };
    write(merged);
    return merged;
  }
  catch {
    return fresh;
  }
}
export function saveDB(db) {
  write(db);
}
export function getAll(key) {
  const db = loadDB();
  return db[key] ?? [];
}
/** Next id for a collection, e.g. nextId("appointments") -> "A-2008". */
export function nextId(key) {
  const prefixes = {
    patients: "P-1",
    doctors: "D-0",
    appointments: "A-2",
    invoices: "INV-3",
    labTests: "LAB-4",
    prescriptions: "RX-5",
    staff: "S-0",
    feedback: "F-6",
  };
  const rows = getAll(key);
  const numbers = rows
    .map((row) => Number(String(row.id).replace(/^\D+/, "")))
    .filter((n) => Number.isFinite(n));
  const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
  return `${prefixes[key]}${String(next).padStart(4, "0")}`.replace(/-0(\d{4})$/, "-$1");
}
export function addRow(key, row) {
  const db = loadDB();
  const list = db[key];
  list.unshift(row);
  write(db);
  return row;
}
export function updateRow(key, id, changes) {
  const db = loadDB();
  const list = db[key];
  const target = list.find((item) => item.id === id);
  if (target)
    Object.assign(target, changes);
  write(db);
}
export function removeRow(key, id) {
  const db = loadDB();
  db[key] = db[key].filter((item) => item.id !== id);
  write(db);
}
/* ---------- auth (simulated) ---------- */
export function getAuth() {
  return loadDB().auth;
}
export function signIn(username, password) {
  const ok = username.trim() === DEMO_CREDENTIALS.username && password === DEMO_CREDENTIALS.password;
  if (!ok)
    return false;
  const db = loadDB();
  db.auth = { loggedIn: true, username: DEMO_CREDENTIALS.username };
  write(db);
  return true;
}
export function signOut() {
  const db = loadDB();
  db.auth = { loggedIn: false, username: "" };
  write(db);
}
/* ---------- settings ---------- */
export function getSettings() {
  return loadDB().settings;
}
export function saveSettings(changes) {
  const db = loadDB();
  db.settings = { ...db.settings, ...changes };
  write(db);
  return db.settings;
}
/* ---------- public site submissions ---------- */
export function saveAppointment(input) {
  const db = loadDB();
  const appointment = {
    id: nextId("appointments"),
    patientName: input.fullName,
    phone: input.phone,
    email: input.email,
    doctor: "To be assigned",
    department: input.department,
    date: input.date,
    time: input.time,
    reason: input.reason,
    status: "Pending",
    source: "website",
  };
  db.appointments.unshift(appointment);
  const known = db.patients.some((p) => p.phone.replace(/\s/g, "") === input.phone.replace(/\s/g, ""));
  if (!known) {
    db.patients.unshift({
      id: nextId("patients"),
      name: input.fullName,
      phone: input.phone,
      email: input.email,
      age: 0,
      gender: "Female",
      lastVisit: input.date,
      status: "New",
    });
  }
  write(db);
  return appointment;
}
export function saveFeedback(input) {
  const db = loadDB();
  const entry = {
    id: nextId("feedback"),
    name: input.name,
    email: input.email,
    rating: Number(input.rating),
    message: input.message,
    date: today(),
  };
  db.feedback.unshift(entry);
  write(db);
  return entry;
}
/** Restores the demo dataset. Used by the staff dashboard. */
export function resetDemoData() {
  const fresh = seed();
  fresh.auth = getAuth();
  write(fresh);
  return fresh;
}
