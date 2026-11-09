import { useEffect, useMemo, useState } from "react";
import { apiBase } from "../services/listings";

const filters = [
  ["all", "All listings"],
  ["pending", "Needs review"],
  ["active", "Live"],
  ["removed", "Taken down"],
  ["rejected", "Rejected"]
];

function AdminDashboard({ onClose }) {
  const [listings, setListings] = useState([]);
  const [message, setMessage] = useState("Loading vehicle listings…");
  const [activeFilter, setActiveFilter] = useState("all");
  const [reasons, setReasons] = useState({});
  const [busyId, setBusyId] = useState("");

  async function load() {
    try {
      const response = await fetch(apiBase + "/api/admin/listings", { credentials: "include" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load listings.");
      setListings(data.listings);
      setMessage(data.listings.length ? "" : "No vehicle listings to review.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const visibleListings = useMemo(
    () => activeFilter === "all" ? listings : listings.filter((listing) => listing.status === activeFilter),
    [listings, activeFilter]
  );

  async function review(listing, status) {
    const reason = (reasons[listing.id] || "").trim();
    if ((status === "removed" || status === "rejected") && reason.length < 12) {
      setMessage("Add a clear reason of at least 12 characters before taking this action.");
      return;
    }
    setBusyId(listing.id);
    setMessage("");
    try {
      const response = await fetch(apiBase + "/api/admin/listings/" + listing.id, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update listing.");
      setReasons((current) => ({ ...current, [listing.id]: "" }));
      await load();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusyId("");
    }
  }

  return <div className="modal-backdrop" role="presentation" onClick={onClose}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Close">×</button><p className="eyebrow">AUTOHUB MANAGEMENT</p><h2 id="admin-title">Vehicle moderation</h2><p className="admin-subtitle">Review new submissions and take down live vehicle listings that breach the Terms.</p>
    <div className="admin-filter-tabs" role="tablist" aria-label="Filter listings">{filters.map(([value, label]) => <button key={value} className={activeFilter === value ? "is-active" : ""} role="tab" aria-selected={activeFilter === value} onClick={() => setActiveFilter(value)}>{label}<span>{value === "all" ? listings.length : listings.filter((listing) => listing.status === value).length}</span></button>)}</div>
    {message && <p className="admin-message" role="status">{message}</p>}
    <div className="admin-list">{visibleListings.map((listing) => {
      const image = Array.isArray(listing.images) && listing.images[0]?.url ? listing.images[0].url : listing.imageUrl;
      return <article key={listing.id} className="admin-row">
        <div className="admin-row-main">{image ? <img className="admin-row-image" src={image} alt="" /> : <div className="admin-row-image admin-row-placeholder">A</div>}<div className="admin-row-info"><div className="admin-row-title-line"><strong>{listing.title}</strong><span className={"admin-status admin-status-" + listing.status}>{listing.status === "removed" ? "Taken down" : listing.status === "pending" ? "Needs review" : listing.status}</span></div><span>{listing.location} · GH₵ {Number(listing.price).toLocaleString()} · {listing.type === "sale" ? "For sale" : "For rent"}</span><small>Owner: {listing.ownerEmail}</small>{listing.moderationReason && <small className="admin-last-reason">Latest action: {listing.moderationReason}</small>}</div></div>
        {["pending", "active"].includes(listing.status) && <div className="admin-row-actions"><label className="admin-reason-field"><span>{listing.status === "active" ? "Reason for taking down" : "Reason for rejection (optional for approval)"}</span><textarea maxLength={500} value={reasons[listing.id] || ""} onChange={(event) => setReasons((current) => ({ ...current, [listing.id]: event.target.value }))} placeholder="Describe the Terms breach or review decision" /></label><div className="admin-actions">{listing.status === "pending" && <><button disabled={busyId === listing.id} className="approve-button" onClick={() => review(listing, "active")}>Approve</button><button disabled={busyId === listing.id} className="reject-button" onClick={() => review(listing, "rejected")}>Reject</button></>}{listing.status === "active" && <button disabled={busyId === listing.id} className="reject-button" onClick={() => review(listing, "removed")}>{busyId === listing.id ? "Taking down…" : "Take down listing"}</button>}</div></div>}
      </article>;
    })}</div>
  </section></div>;
}

export default AdminDashboard;
