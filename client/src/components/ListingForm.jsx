import { useState } from "react";
import { apiBase } from "../services/listings";

const initial = { title: "", description: "", make: "", model: "", year: new Date().getFullYear(), location: "", transmission: "Automatic", fuel: "Petrol", body: "Sedan", price: "", type: "sale", imageUrl: "" };

function ListingForm({ onClose, onSuccess }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${apiBase}/api/listings`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, year: Number(form.year), price: Number(form.price) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create listing.");
      onSuccess();
    } catch (requestError) { setError(requestError.message === "Failed to fetch" ? "The listing service is unavailable. Please try again later." : requestError.message); }
    finally { setBusy(false); }
  }

  return <div className="modal-backdrop" role="presentation" onClick={onClose}><section className="listing-modal" role="dialog" aria-modal="true" aria-labelledby="listing-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Close">×</button><p className="eyebrow">SHARE YOUR VEHICLE</p><h2 id="listing-title">Create a listing</h2><p className="listing-intro">New listings are reviewed before appearing in search.</p><form className="listing-form" onSubmit={submit}><label className="wide">Listing title<input name="title" required minLength="3" maxLength="100" placeholder="2022 Toyota Camry SE" value={form.title} onChange={update} /></label><label>Make<input name="make" required maxLength="60" value={form.make} onChange={update} /></label><label>Model<input name="model" required maxLength="60" value={form.model} onChange={update} /></label><label>Year<input name="year" type="number" min="1980" max={new Date().getFullYear()+1} required value={form.year} onChange={update} /></label><label>City or region<input name="location" required minLength="2" maxLength="100" placeholder="Accra" value={form.location} onChange={update} /></label><label>Transmission<select name="transmission" value={form.transmission} onChange={update}><option>Automatic</option><option>Manual</option></select></label><label>Fuel<select name="fuel" value={form.fuel} onChange={update}><option>Petrol</option><option>Diesel</option><option>Hybrid</option><option>Electric</option></select></label><label>Body type<input name="body" required minLength="2" maxLength="40" placeholder="SUV" value={form.body} onChange={update} /></label><label>Listing type<select name="type" value={form.type} onChange={update}><option value="sale">For sale</option><option value="rent">For rent</option></select></label><label>Price (GH₵{form.type === "rent" ? " per day" : ""})<input name="price" type="number" min="1" step="0.01" required value={form.price} onChange={update} /></label><label>Photo URL<input name="imageUrl" type="url" maxLength="2048" placeholder="https://…" value={form.imageUrl} onChange={update} /></label><label className="wide">Description<textarea name="description" rows="3" maxLength="4000" value={form.description} onChange={update} /></label>{error && <p className="listing-error wide" role="alert">{error}</p>}<div className="listing-submit wide"><button type="button" className="button button-outline" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? "Submitting…" : "Submit for review"}</button></div></form></section></div>;
}

export default ListingForm;
