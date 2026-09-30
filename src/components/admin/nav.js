import { BarChart3, CalendarClock, FlaskConical, IdCardLanyard, LayoutDashboard, Pill, ReceiptText, Settings, Stethoscope, Users, } from "lucide-react";
/** Single source of truth for the dashboard sidebar and page titles. */
export const adminNavSections = [
  {
    label: "Main",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard, description: "Today at a glance" },
    ],
  },
  {
    label: "Clinical",
    items: [
      { to: "/admin/patients", label: "Patients", icon: Users, description: "Patient records" },
      { to: "/admin/doctors", label: "Doctors", icon: Stethoscope, description: "Clinical team" },
      { to: "/admin/appointments", label: "Appointments", icon: CalendarClock, description: "Bookings and requests" },
    ],
  },
  {
    label: "Records",
    items: [
      { to: "/admin/laboratory", label: "Laboratory", icon: FlaskConical, description: "Tests and results" },
      { to: "/admin/prescriptions", label: "Prescriptions", icon: Pill, description: "Issued medication" },
    ],
  },
  {
    label: "Finance",
    items: [{ to: "/admin/billing", label: "Billing", icon: ReceiptText, description: "Invoices and payments" }],
  },
  {
    label: "Insights",
    items: [{ to: "/admin/reports", label: "Reports", icon: BarChart3, description: "Clinic performance" }],
  },
  {
    label: "Team",
    items: [{ to: "/admin/staff", label: "Staff management", icon: IdCardLanyard, description: "System users" }],
  },
  {
    label: "System",
    items: [{ to: "/admin/settings", label: "Settings", icon: Settings, description: "Clinic profile" }],
  },
];
const allItems = adminNavSections.flatMap((section) => section.items);
export function findNavItem(pathname) {
  return allItems.find((item) => item.to === pathname) ?? allItems.find((item) => item.to !== "/admin" && pathname.startsWith(item.to));
}
export function pageMetaFor(pathname) {
  const item = findNavItem(pathname);
  return { title: item?.label ?? "Dashboard", description: item?.description ?? "Clinic overview" };
}
