import { usePageMeta } from "@/lib/use-page-meta";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { LoginScreen } from "@/components/admin/LoginScreen";
import { Toaster } from "@/components/admin/Toaster";
import { getAuth } from "@/lib/clinic-db";
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
  const [signedIn, setSignedIn] = useState(null);
  useEffect(() => {
    setSignedIn(getAuth().loggedIn);
  }, []);
  return (<>
   {signedIn === null ? (<div className="admin-splash">Loading clinic dashboard…</div>) : signedIn ? (<AdminShell onSignOut={() => setSignedIn(false)}/>) : (<LoginScreen onSuccess={() => setSignedIn(true)}/>)}
   <Toaster />
  </>);
}
