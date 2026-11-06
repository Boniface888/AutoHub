import { useState } from "react";
import { apiBase } from "../services/listings";

function AuthModal({ mode, resetToken, onClose, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(mode === "signup" ? "signup" : mode === "reset" ? "reset" : "login");
  const isSignup = step === "signup";
  const isForgot = step === "forgot";
  const isReset = step === "reset";

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    const endpoint = isSignup ? "register" : step === "login" ? "login" : isForgot ? "forgot-password" : "reset-password";
    const body = isReset ? { token: resetToken, password } : isForgot ? { email } : { email, password };
    try {
      const response = await fetch(`${apiBase}/api/auth/${endpoint}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not complete the request.");
      if (isSignup || step === "login") {
        onSuccess(data.user);
      } else if (isForgot) {
        setMessage(data.message);
      } else {
        window.history.replaceState({}, "", `${window.location.pathname}${window.location.hash}`);
        setStep("login");
        setPassword("");
        setMessage(data.message);
      }
    } catch (requestError) {
      setError(requestError.message === "Failed to fetch" ? "Account service is unavailable. Try again shortly." : requestError.message);
    } finally {
      setBusy(false);
    }
  }

  function dismiss() {
    if (resetToken) window.history.replaceState({}, "", `${window.location.pathname}${window.location.hash}`);
    onClose();
  }

  function changeStep(nextStep) {
    setStep(nextStep);
    setPassword("");
    setError("");
    setMessage("");
  }

  const title = isSignup ? "Create your account" : isForgot ? "Forgot your password?" : isReset ? "Choose a new password" : "Welcome back";
  const intro = isSignup ? "Save listings and connect with car owners." : isForgot ? "Enter your account email and we’ll send you a secure reset link." : isReset ? "Choose a new password for your AutoHub account." : "Sign in to continue your journey.";

  return <div className="modal-backdrop" role="presentation" onClick={dismiss}><section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={dismiss} aria-label="Close">×</button><span className="brand-mark">A</span><p className="eyebrow">YOUR AUTOHUB ACCOUNT</p><h2 id="auth-title">{title}</h2><p className="auth-intro">{intro}</p><form onSubmit={submit}>{!isReset && <label>Email address<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></label>}{(isSignup || step === "login" || isReset) && <label>{isReset ? "New password" : "Password"}<input type="password" autoComplete={isSignup || isReset ? "new-password" : "current-password"} required minLength={isSignup || isReset ? 10 : 1} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /><small>{isSignup || isReset ? "Use at least 10 characters." : ""}</small></label>}{step === "login" && <button type="button" className="auth-text-link" onClick={() => changeStep("forgot")}>Forgot password?</button>}{error && <p className="auth-error" role="alert">{error}</p>}{message && <p className="auth-message" role="status">{message}</p>}<button className="button button-primary auth-submit" disabled={busy}>{busy ? "Please wait…" : isSignup ? "Create account" : isForgot ? "Send reset link" : isReset ? "Save new password" : "Sign in"}</button></form>{isForgot && <button type="button" className="auth-text-link auth-back-link" onClick={() => changeStep("login")}>Back to sign in</button>}</section></div>;
}

export default AuthModal;
