import { createContext, useContext } from "react";

/** The signed-in staff member: { id, username, fullName, role }. */
export const AdminUserContext = createContext(null);

export function useAdminUser() {
  return useContext(AdminUserContext);
}

// Which pages each role may open. The server enforces the same rules on the data.
const PAGES = {
  administrator: [
    "/admin",
    "/admin/patients",
    "/admin/doctors",
    "/admin/appointments",
    "/admin/laboratory",
    "/admin/prescriptions",
    "/admin/billing",
    "/admin/reports",
    "/admin/feedback",
    "/admin/staff",
    "/admin/audit",
    "/admin/settings",
  ],
  doctor: [
    "/admin",
    "/admin/patients",
    "/admin/appointments",
    "/admin/laboratory",
    "/admin/prescriptions",
  ],
  receptionist: ["/admin", "/admin/patients", "/admin/appointments", "/admin/laboratory"],
  lab_technician: ["/admin/laboratory"],
};

const ROLE_LABELS = {
  administrator: "Administrator",
  doctor: "Doctor",
  receptionist: "Receptionist",
  lab_technician: "Lab technician",
};

/** True if the role may open this admin address. */
export function canOpen(role, pathname) {
  const allowed = PAGES[role] ?? [];
  return allowed.some((to) =>
    to === "/admin" ? pathname === "/admin" : pathname === to || pathname.startsWith(to + "/"),
  );
}

/** The first page a role should land on. */
export function homePathFor(role) {
  return (PAGES[role] ?? ["/admin"])[0];
}

export function roleLabel(role) {
  return ROLE_LABELS[role] ?? role;
}

export function userInitial(user) {
  const name = (user?.fullName || user?.username || "?").trim();
  return name.charAt(0).toUpperCase();
}
