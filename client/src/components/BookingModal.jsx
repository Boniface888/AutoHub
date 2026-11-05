import { useState } from "react";
import { apiBase } from "../services/listings";

function BookingModal({ car, onClose, onSuccess }) {
  const today = new Date();
  const minDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await fetch(`${apiBase}/api/bookings`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listingId: car.id, startsAt: new Date(`${startsAt}T12:00:00`).toISOString(), endsAt: new Date(`${endsAt}T12:00:00`).toISOString() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not request those dates.");
      onSuccess();
    } catch (requestError) { setError(requestError.message === "Failed to fetch" ? "The rental service is unavailable. Please try again later." : requestError.message); }
    finally { setBusy(false); }
  }

  return <div className="modal-backdrop" role="presentation" onClick={onClose}><section className="auth-modal booking-modal" role="dialog" aria-modal="true" aria-labelledby="booking-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Close">×</button><p className="eyebrow">RENTAL REQUEST</p><h2 id="booking-title">{car.name}</h2><p className="auth-intro">Choose your dates. The owner will confirm availability.</p><form onSubmit={submit}><label>Start date<input type="date" min={minDate} required value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></label><label>End date<input type="date" min={startsAt || minDate} required value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="button button-primary auth-submit" disabled={busy}>{busy ? "Sending…" : "Request these dates"}</button></form></section></div>;
}

export default BookingModal;
