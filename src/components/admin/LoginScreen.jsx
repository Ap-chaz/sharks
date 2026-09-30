import { ShieldAlert } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/clinic/logo.jpg";
import { DEMO_CREDENTIALS, signIn } from "@/lib/clinic-db";
import { showToast } from "@/lib/toast";
/** Simulated sign-in. It demonstrates the dashboard only — it is not security. */
export function LoginScreen({ onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  function submit(event) {
    event.preventDefault();
    const next = {};
    if (!username.trim())
      next.username = "Enter your username.";
    if (!password)
      next.password = "Enter your password.";
    if (Object.keys(next).length) {
      setErrors(next);
      setFormError("");
      return;
    }
    if (!signIn(username, password)) {
      setErrors({});
      setFormError("Invalid username or password. Use the demo credentials shown below.");
      return;
    }
    setErrors({});
    setFormError("");
    showToast("Signed in to the clinic dashboard.");
    onSuccess();
  }
  return (<div className="login-screen">
   <form className="login-card" onSubmit={submit} noValidate>
    <div className="login-brand">
     <img src={logo} alt=""/>
     <div>
      <span>SHARKS Clinic</span>
      <small>Management system</small>
     </div>
    </div>

    <h1>Admin sign in</h1>
    <p className="login-subtitle">Enter your credentials to reach the clinic dashboard.</p>

    <label className={`field ${errors.username ? "field-invalid" : ""}`}>
     <span>Username</span>
     <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="admin" autoComplete="username"/>
     {errors.username && <small>{errors.username}</small>}
    </label>

    <label className={`field ${errors.password ? "field-invalid" : ""}`}>
     <span>Password</span>
     <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" autoComplete="current-password"/>
     {errors.password && <small>{errors.password}</small>}
    </label>

    {formError && <p className="login-error">{formError}</p>}
    <button type="submit" className="button button-accent login-submit">
     Sign in
    </button>

    <p className="login-hint">
     Demo credentials: <strong>{DEMO_CREDENTIALS.username}</strong> / <strong>{DEMO_CREDENTIALS.password}</strong>
    </p>
    <p className="login-warning">
     <ShieldAlert size={15}/>
     This is a demo login. Anyone who knows the password can reach this dashboard, and records are stored only in
     this browser.
    </p>
   </form>
   <a className="login-back" href="/">
    Back to the clinic website
   </a>
  </div>);
}
