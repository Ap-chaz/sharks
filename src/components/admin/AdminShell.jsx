import { ExternalLink, LogOut, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import logo from "@/assets/clinic/logo-full.png";
import { api } from "@/lib/api";
import { adminNavSections, pageMetaFor } from "./nav";
/** Sidebar shell that every dashboard view renders into. */
export function AdminShell({ onSignOut }) {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const meta = pageMetaFor(pathname);
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);
  // While the mobile drawer is open: lock page scroll, allow Escape to close,
  // and close it if the window is resized up to the desktop layout.
  useEffect(() => {
    if (!menuOpen)
      return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event) => {
      if (event.key === "Escape")
        setMenuOpen(false);
    };
    const wide = window.matchMedia("(min-width: 901px)");
    const onWide = (event) => {
      if (event.matches)
        setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [menuOpen]);
  async function handleSignOut() {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    onSignOut();
  }
  return (<div className="admin-shell">
   <aside className={`admin-sidebar ${menuOpen ? "open" : ""}`}>
    <div className="admin-brand">
     <div className="admin-brand-text">
      <img src={logo} alt="SHARKS Clinic"/>
      <small>Management system</small>
     </div>
     <button type="button" className="admin-sidebar-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
      <X size={18}/>
     </button>
    </div>

    <nav className="admin-nav" aria-label="Dashboard navigation">
     {adminNavSections.map((section) => (<div key={section.label} className="admin-nav-section">
       <span className="admin-nav-label">{section.label}</span>
       {section.items.map((item) => {
        const active = item.to === "/admin" ? pathname === "/admin" : pathname.startsWith(item.to);
        return (<Link key={item.to} to={item.to} className={`admin-nav-item ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}>
          <item.icon size={17}/>
          <span>{item.label}</span>
         </Link>);
      })}
      </div>))}
    </nav>

    <div className="admin-sidebar-foot">
     <Link to="/" className="admin-nav-item" target="_blank" rel="noreferrer">
      <ExternalLink size={17}/>
      <span>View public site</span>
     </Link>
     <button type="button" className="admin-nav-item" onClick={handleSignOut}>
      <LogOut size={17}/>
      <span>Sign out</span>
     </button>
    </div>
   </aside>

   {menuOpen && <div className="admin-sidebar-overlay" onClick={() => setMenuOpen(false)}/>}

   <div className="admin-body">
    <header className="admin-topbar">
     <button type="button" className="admin-menu-button" onClick={() => setMenuOpen(true)} aria-label="Open menu">
      <Menu size={19}/>
     </button>
     <div className="admin-topbar-title">
      <span>{meta.title}</span>
      <small>{meta.description}</small>
     </div>
     <div className="admin-topbar-actions">
      <span className="admin-user">
       <span className="admin-avatar" aria-hidden="true">
        A
       </span>
       <span className="admin-user-name">admin</span>
      </span>
     </div>
    </header>
    <main className="admin-main">
     <Outlet />
    </main>
   </div>

  </div>);
}
