import { useState } from "react";
import { apiBase } from "../services/listings";

function AuthModal({ mode, onClose, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isSignup = mode === "signup";

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch(`${apiBase}/api/auth/${isSignup ? "register" : "login"}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not sign in.");
      onSuccess(data.user);
    } catch (requestError) {
      setError(requestError.message === "Failed to fetch" ? "Account service is unavailable. Start the AutoHub API and try again." : requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return <div className="modal-backdrop" role="presentation" onClick={onClose}><section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Close">×</button><span className="brand-mark">A</span><p className="eyebrow">YOUR AUTOHUB ACCOUNT</p><h2 id="auth-title">{isSignup ? "Create your account" : "Welcome back"}</h2><p className="auth-intro">{isSignup ? "Save listings and connect with car owners." : "Sign in to continue your journey."}</p><form onSubmit={submit}><label>Email address<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input type="password" autoComplete={isSignup ? "new-password" : "current-password"} required minLength={isSignup ? 10 : 1} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /><small>{isSignup ? "Use at least 10 characters." : ""}</small></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="button button-primary auth-submit" disabled={busy}>{busy ? "Please wait…" : isSignup ? "Create account" : "Sign in"}</button></form></section></div>;
}

export default AuthModal;
