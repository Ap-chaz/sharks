import { useEffect } from "react";
import { Outlet, Route, Routes, useLocation } from "react-router-dom";
import { SiteLayout } from "./components/SiteChrome";

import Home from "./pages/Home";
import About from "./pages/About";
import Services from "./pages/Services";
import OurDoctors from "./pages/Doctors";
import Contact from "./pages/Contact";
import Appointment from "./pages/Appointment";
import Feedback from "./pages/Feedback";
import NotFound from "./pages/NotFound";

import AdminGate from "./pages/admin/AdminGate";
import Dashboard from "./pages/admin/Dashboard";
import Patients from "./pages/admin/Patients";
import Doctors from "./pages/admin/Doctors";
import Appointments from "./pages/admin/Appointments";
import Laboratory from "./pages/admin/Laboratory";
import Prescriptions from "./pages/admin/Prescriptions";
import Billing from "./pages/admin/Billing";
import Reports from "./pages/admin/Reports";
import Staff from "./pages/admin/Staff";
import Settings from "./pages/admin/Settings";

/** Public pages share the site header, footer and floating WhatsApp button. */
function PublicLayout() {
  return (
    <SiteLayout>
      <Outlet />
    </SiteLayout>
  );
}

/** Start each page at the top when navigating between routes. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<Services />} />
          <Route path="/doctors" element={<OurDoctors />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/appointment" element={<Appointment />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* The staff area has its own layout (AdminShell), so no public chrome. */}
        <Route path="/admin" element={<AdminGate />}>
          <Route index element={<Dashboard />} />
          <Route path="patients" element={<Patients />} />
          <Route path="doctors" element={<Doctors />} />
          <Route path="appointments" element={<Appointments />} />
          <Route path="laboratory" element={<Laboratory />} />
          <Route path="prescriptions" element={<Prescriptions />} />
          <Route path="billing" element={<Billing />} />
          <Route path="reports" element={<Reports />} />
          <Route path="staff" element={<Staff />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </>
  );
}
