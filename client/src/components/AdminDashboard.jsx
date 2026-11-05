import { useEffect, useState } from "react";
import { apiBase } from "../services/listings";

function AdminDashboard({ onClose }) {
  const [listings, setListings] = useState([]);
  const [message, setMessage] = useState("Loading pending listings…");

  async function load() {
    try {
      const response = await fetch(`${apiBase}/api/admin/listings`, { credentials: "include" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load listings.");
      setListings(data.listings);
      setMessage(data.listings.length ? "" : "No listings need review.");
    } catch (error) { setMessage(error.message); }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function review(id, status) {
    const response = await fetch(`${apiBase}/api/admin/listings/${id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error || "Could not update listing."); return; }
    await load();
  }

  return <div className="modal-backdrop" role="presentation" onClick={onClose}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Close">×</button><p className="eyebrow">AUTOHUB MANAGEMENT</p><h2 id="admin-title">Listing review</h2><p className="admin-subtitle">Review new vehicle listings before they appear in search.</p>{message && <p className="admin-message" role="status">{message}</p>}<div className="admin-list">{listings.map((listing) => <article key={listing.id} className="admin-row"><div><strong>{listing.title}</strong><span>{listing.location} · GH₵ {Number(listing.price).toLocaleString()} · {listing.type}</span></div><div className="admin-actions"><button className="approve-button" onClick={() => review(listing.id, "active")}>Approve</button><button className="reject-button" onClick={() => review(listing.id, "rejected")}>Reject</button></div></article>)}</div></section></div>;
}

export default AdminDashboard;
