import { useState } from "react";
import { api } from "@/lib/api";
import { showToast } from "@/lib/toast";
/** Simulated sign-in. It demonstrates the dashboard only — it is not security. */
export function LoginScreen({ onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  async function submit(event) {
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
    const result = await api("/auth/login", { method: "POST", body: { username: username.trim(), password } }).then(() => null, (error) => error);
    if (result) {
      setErrors({});
      setFormError(result.message);
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
     <div>
      <span><strong>SHARKS</strong> Clinic</span>
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
     Sign in with your clinic staff account.
    </p>
   </form>
   <a className="login-back" href="/">
    Back to the clinic website
   </a>
  </div>);
}
