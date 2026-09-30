import { ExternalLink, LogOut, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import logo from "@/assets/clinic/logo.jpg";
import { signOut } from "@/lib/clinic-db";
import { adminNavSections, pageMetaFor } from "./nav";
/** Sidebar shell that every dashboard view renders into. */
export function AdminShell({ onSignOut }) {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const meta = pageMetaFor(pathname);
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);
  function handleSignOut() {
    signOut();
    onSignOut();
  }
  return (<div className="admin-shell">
   <aside className={`admin-sidebar ${menuOpen ? "open" : ""}`}>
    <div className="admin-brand">
     <img src={logo} alt=""/>
     <div className="admin-brand-text">
      <span>SHARKS Clinic</span>
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
       admin
      </span>
     </div>
    </header>
    <main className="admin-main">
     <Outlet />
    </main>
   </div>

  </div>);
}
