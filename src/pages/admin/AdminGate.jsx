import { usePageMeta } from "@/lib/use-page-meta";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { LoginScreen } from "@/components/admin/LoginScreen";
import { Toaster } from "@/components/admin/Toaster";
import { api } from "@/lib/api";
import { AdminUserContext } from "@/lib/admin-user";
const pageMeta = [
  { title: "Staff Dashboard — SHARKS Clinic" },
  { name: "description", content: "SHARKS Clinic staff dashboard for appointments, patients, laboratory and billing." },
  { name: "robots", content: "noindex" },
];
/**
 * The sign-in check reads browser storage, so it runs in an effect
 * after the first render.
 */
export default function AdminRoute() {
  usePageMeta(pageMeta);
  const [user, setUser] = useState(undefined);
  useEffect(() => {
    api("/auth/me").then((data) => setUser(data.user), () => setUser(null));
  }, []);
  return (<>
   {user === undefined ? (<div className="admin-splash">Loading clinic dashboard…</div>) : user ? (<AdminUserContext.Provider value={user}><AdminShell onSignOut={() => setUser(null)}/></AdminUserContext.Provider>) : (<LoginScreen onSuccess={() => api("/auth/me").then((data) => setUser(data.user), () => setUser(null))}/>)}
   <Toaster />
  </>);
}
