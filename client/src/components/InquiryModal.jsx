import { useState } from "react";
import { apiBase } from "../services/listings";

function InquiryModal({ car, onClose }) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch(`${apiBase}/api/listings/${encodeURIComponent(car.id)}/inquiries`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not send your interest.");
      setResult(data);
    } catch (requestError) {
      setError(requestError.message === "Failed to fetch" ? "The contact service is unavailable. Please try again later." : requestError.message);
    } finally { setBusy(false); }
  }

  return <div className="modal-backdrop" role="presentation" onClick={onClose}><section className="auth-modal booking-modal" role="dialog" aria-modal="true" aria-labelledby="inquiry-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Close">×</button><p className="eyebrow">CONTACT THE SELLER</p><h2 id="inquiry-title">{result ? "Seller contact details" : car.name}</h2>{result ? <><p className="auth-intro">{result.notificationSent ? "The seller has been notified by email. You can also contact them directly." : "Your interest was saved, but the seller could not be notified by email yet. Contact them directly below."}</p><div className="owner-contact-links">{result.sellerContact.phone && <a href={`tel:${result.sellerContact.phone}`}>Call {result.sellerContact.phone}</a>}{result.sellerContact.email && <a href={`mailto:${result.sellerContact.email}`}>Email {result.sellerContact.email}</a>}</div><button className="button button-primary auth-submit" onClick={onClose}>Done</button></> : <><p className="auth-intro">Leave your phone number and a short note. We’ll send your contact details to the seller.</p><form onSubmit={submit}><label>Your phone number<input type="tel" required minLength="7" maxLength="20" autoComplete="tel" placeholder="+233 20 123 4567" value={phone} onChange={(event) => setPhone(event.target.value)} /></label><label>Message<textarea rows="3" maxLength="1000" placeholder="I’m interested in this car. When can I view it?" value={message} onChange={(event) => setMessage(event.target.value)} /></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="button button-primary auth-submit" disabled={busy}>{busy ? "Sending…" : "Send my interest"}</button></form></>}</section></div>;
}

export default InquiryModal;
