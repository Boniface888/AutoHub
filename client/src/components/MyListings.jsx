import { useEffect, useState } from "react";
import { apiBase } from "../services/listings";

const statusLabels = {
  sale: { active: "Live", removed: "Removed by admin", paused: "Taken down", sold: "Sold", rented: "Rented", pending: "Pending review", rejected: "Not approved" },
  rent: { active: "Live", removed: "Removed by admin", paused: "Taken down", sold: "Sold", rented: "Rented", pending: "Pending review", rejected: "Not approved" },
};

function MyListings({ onClose, onChanged }) {
  const [listings, setListings] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`${apiBase}/api/owner/listings`, { credentials: "include" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load your listings.");
        if (active) setListings(data.listings);
      })
      .catch((requestError) => { if (active) setError(requestError.message === "Failed to fetch" ? "The listing service is unavailable." : requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function updateStatus(listing, action) {
    const isSale = listing.type === "sale";
    const noun = isSale ? "sale" : "rental";
    const confirmation = action === "take_down"
      ? `Temporarily take down this ${noun} listing? You can restore it later.`
      : action === "restore"
        ? `Restore this ${noun} listing to the marketplace?`
        : isSale
          ? "Mark this car as sold? It will be removed from cars for sale."
          : "Mark this car as rented? It will be removed from cars for rent.";
    if (!window.confirm(confirmation)) return;
    setBusyId(listing.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/owner/listings/${listing.id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update this listing.");
      setListings((current) => current.map((item) => item.id === listing.id ? { ...item, status: data.listing.status } : item));
      onChanged(listings.length);
    } catch (requestError) { setError(requestError.message === "Failed to fetch" ? "The listing service is unavailable." : requestError.message); }
    finally { setBusyId(""); }
  }

  async function deleteListing(listing) {
    const description = listing.type === "sale" ? "sale listing" : "rental listing";
    const related = listing.type === "sale" ? "buyer requests" : "rental requests and bookings";
    if (!window.confirm(`Permanently delete this ${description} and its contact details? Any related ${related} will also be deleted.`)) return;
    setBusyId(listing.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`${apiBase}/api/owner/listings/${listing.id}`, { method: "DELETE", credentials: "include" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete this listing.");
      setMessage(data.imagesRemoved ? "The listing and its photos have been deleted." : "The listing has been deleted. Photo storage could not confirm that every image was removed.");
      const remainingCount = listings.length - 1;
      setListings((current) => current.filter((item) => item.id !== listing.id));
      onChanged(remainingCount);
    } catch (requestError) { setError(requestError.message === "Failed to fetch" ? "The listing service is unavailable." : requestError.message); }
    finally { setBusyId(""); }
  }

  return <div className="modal-backdrop" role="presentation" onClick={onClose}><section className="owner-listings" role="dialog" aria-modal="true" aria-labelledby="owner-listings-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Close">×</button><p className="eyebrow">YOUR VEHICLES</p><h2 id="owner-listings-title">Manage your listings</h2><p className="owner-listings-intro">Take down or restore a listing. Mark a sale as sold or a rental as rented when it is no longer available.</p>{loading && <p className="request-inbox-state">Loading your listings…</p>}{error && <p className="auth-error" role="alert">{error}</p>}{message && <p className="auth-message" role="status">{message}</p>}{!loading && listings.length === 0 && <div className="request-inbox-empty"><h3>No listings yet</h3><p>Once you publish a car for sale or rent, you can manage it here.</p></div>}{!loading && listings.length > 0 && <div className="owner-listing-list">{listings.map((listing) => {
    const isSale = listing.type === "sale";
    const isActive = listing.status === "active";
    const isRemoved = listing.status === "paused";
    return <article className="owner-listing-card" key={listing.id}><div className="owner-listing-info"><div className="owner-listing-heading"><span className={`request-type request-type-${listing.type}`}>{isSale ? "FOR SALE" : "FOR RENT"}</span><span className="owner-listing-status">{statusLabels[listing.type][listing.status] || listing.status}</span></div><h3>{listing.title}</h3><p>{listing.year} · {listing.location} · GH₵ {Number(listing.price).toLocaleString()}{!isSale && " / day"}</p>{listing.status === "removed" && listing.moderationReason && <p className="owner-takedown-reason">Removed by AutoHub: {listing.moderationReason} Contact support to request a review.</p>}</div><div className="owner-listing-actions">{isActive && <><button type="button" className="button button-outline" disabled={busyId === listing.id} onClick={() => updateStatus(listing, "take_down")}>{isSale ? "Take down sale listing" : "Take down rental listing"}</button><button type="button" className="button button-primary" disabled={busyId === listing.id} onClick={() => updateStatus(listing, "complete")}>{isSale ? "Mark as sold" : "Mark as rented"}</button></>}{isRemoved && <button type="button" className="button button-outline" disabled={busyId === listing.id} onClick={() => updateStatus(listing, "restore")}>{isSale ? "Restore sale listing" : "Restore rental listing"}</button>}<button type="button" className="owner-delete-button" disabled={busyId === listing.id} onClick={() => deleteListing(listing)}>{isSale ? "Delete sale listing" : "Delete rental listing"}</button></div></article>;
  })}</div>}<div className="request-inbox-footer"><button className="button button-outline" onClick={onClose}>Close</button></div></section></div>;
}

export default MyListings;
