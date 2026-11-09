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
  const [overview, setOverview] = useState(null);
  const [activity, setActivity] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [section, setSection] = useState("overview");
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityPage, setActivityPage] = useState(1);
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

  async function loadAdminOverview() {
    try {
      const [summaryResponse, activityResponse, notificationResponse] = await Promise.all([
        fetch(apiBase + "/api/admin/overview", { credentials: "include" }),
        fetch(apiBase + "/api/admin/activity?page=1&pageSize=30", { credentials: "include" }),
        fetch(apiBase + "/api/admin/notifications", { credentials: "include" })
      ]);
      const [summaryData, activityData, notificationData] = await Promise.all([summaryResponse.json(), activityResponse.json(), notificationResponse.json()]);
      if (!summaryResponse.ok || !activityResponse.ok || !notificationResponse.ok) throw new Error(summaryData.error || activityData.error || notificationData.error || "Could not load site activity.");
      setOverview(summaryData.overview);
      setActivity(activityData.events);
      setActivityTotal(activityData.total);
      setActivityPage(1);
      setNotifications(notificationData.notifications);
    } catch (error) { setMessage(error.message); }
  }

  async function loadMoreActivity() {
    const nextPage = activityPage + 1;
    try {
      const response = await fetch(`${apiBase}/api/admin/activity?page=${nextPage}&pageSize=30`, { credentials: "include" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load more activity.");
      setActivity((items) => [...items, ...data.events]);
      setActivityPage(nextPage);
    } catch (error) { setMessage(error.message); }
  }

  async function markNotificationsRead() {
    if (!notifications.length) return;
    try {
      let batch = notifications;
      while (batch.length) {
        const response = await fetch(apiBase + "/api/admin/notifications/read", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventIds: batch.map((item) => item.id) }) });
        if (!response.ok) throw new Error("Could not mark alerts as read.");
        const nextResponse = await fetch(apiBase + "/api/admin/notifications", { credentials: "include" });
        if (!nextResponse.ok) throw new Error("Could not refresh alerts.");
        const nextData = await nextResponse.json();
        batch = nextData.notifications;
        if (batch.length) setNotifications(batch);
      }
      setNotifications([]);
      window.dispatchEvent(new Event("autohub-admin-notifications-read"));
      await loadAdminOverview();
    } catch (error) { setMessage(error.message); }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    const overviewTimer = window.setTimeout(() => { void loadAdminOverview(); }, 0);
    return () => { window.clearTimeout(timer); window.clearTimeout(overviewTimer); };
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

  return <div className="modal-backdrop" role="presentation" onClick={onClose}><section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="admin-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Close">×</button><p className="eyebrow">AUTOHUB MANAGEMENT</p><h2 id="admin-title">Admin dashboard</h2><p className="admin-subtitle">Monitor marketplace activity, review site totals, and moderate listings that breach the Terms.</p>
    <div className="admin-filter-tabs" role="tablist" aria-label="Admin dashboard sections"><button className={section === "overview" ? "is-active" : ""} role="tab" aria-selected={section === "overview"} onClick={() => setSection("overview")}>Overview & activity</button><button className={section === "moderation" ? "is-active" : ""} role="tab" aria-selected={section === "moderation"} onClick={() => setSection("moderation")}>Moderate vehicles</button></div>
    {section === "overview" && <>
      {overview ? <div className="admin-stat-grid">{[["Available now", overview.availableVehicles], ["Marked sold", overview.soldVehicles], ["Marked rented", overview.rentedVehicles], ["Needs review", overview.pendingReview], ["Accounts", overview.accounts], ["Sale inquiries", overview.saleInquiries], ["Rental requests", overview.rentalRequests], ["All vehicle records", overview.totalVehicles]].map(([label, value]) => <article className="admin-stat" key={label}><span>{label}</span><strong>{Number(value).toLocaleString()}</strong></article>)}</div> : <p className="admin-message">Loading site totals…</p>}
      <div className="admin-section-heading"><div><h3>In-app alerts</h3><p>New listings, buyer inquiries, rental requests, and owner-confirmed completions.</p></div>{notifications.length > 0 && <button className="admin-mark-read" onClick={markNotificationsRead}>Mark all read ({notifications.length})</button>}</div>
      {notifications.length ? <div className="admin-activity-list">{notifications.map((item) => <article className="admin-activity admin-activity-unread" key={item.id}><span className="admin-unread-dot" aria-hidden="true"/><div><strong>{item.summary}</strong><small>{new Date(item.createdAt).toLocaleString()}</small></div></article>)}</div> : <p className="admin-empty">No unread alerts.</p>}
      <div className="admin-section-heading"><div><h3>Site activity</h3><p>{Number(activityTotal).toLocaleString()} recorded events. Completed sales and rentals reflect owner confirmation.</p></div></div>
      {activity.length ? <div className="admin-activity-list">{activity.map((item) => <article className="admin-activity" key={item.id}><div><strong>{item.summary}</strong><small>{item.actorEmail || "Account unavailable"} · {new Date(item.createdAt).toLocaleString()}</small></div><span className="admin-event-type">{item.eventType.replaceAll(".", " ")}</span></article>)}</div> : <p className="admin-empty">No activity has been recorded yet.</p>}
      {activity.length < activityTotal && <button className="admin-load-more" onClick={loadMoreActivity}>Load more activity</button>}
    </>}
    {section === "moderation" && <>
    <div className="admin-filter-tabs" role="tablist" aria-label="Filter listings">{filters.map(([value, label]) => <button key={value} className={activeFilter === value ? "is-active" : ""} role="tab" aria-selected={activeFilter === value} onClick={() => setActiveFilter(value)}>{label}<span>{value === "all" ? listings.length : listings.filter((listing) => listing.status === value).length}</span></button>)}</div>
    {message && <p className="admin-message" role="status">{message}</p>}
    <div className="admin-list">{visibleListings.map((listing) => {
      const image = Array.isArray(listing.images) && listing.images[0]?.url ? listing.images[0].url : listing.imageUrl;
      return <article key={listing.id} className="admin-row">
        <div className="admin-row-main">{image ? <img className="admin-row-image" src={image} alt="" /> : <div className="admin-row-image admin-row-placeholder">A</div>}<div className="admin-row-info"><div className="admin-row-title-line"><strong>{listing.title}</strong><span className={"admin-status admin-status-" + listing.status}>{listing.status === "removed" ? "Taken down" : listing.status === "pending" ? "Needs review" : listing.status}</span></div><span>{listing.location} · GH₵ {Number(listing.price).toLocaleString()} · {listing.type === "sale" ? "For sale" : "For rent"}</span><small>Owner: {listing.ownerEmail}</small>{listing.moderationReason && <small className="admin-last-reason">Latest action: {listing.moderationReason}</small>}</div></div>
        {["pending", "active"].includes(listing.status) && <div className="admin-row-actions"><label className="admin-reason-field"><span>{listing.status === "active" ? "Reason for taking down" : "Reason for rejection (optional for approval)"}</span><textarea maxLength={500} value={reasons[listing.id] || ""} onChange={(event) => setReasons((current) => ({ ...current, [listing.id]: event.target.value }))} placeholder="Describe the Terms breach or review decision" /></label><div className="admin-actions">{listing.status === "pending" && <><button disabled={busyId === listing.id} className="approve-button" onClick={() => review(listing, "active")}>Approve</button><button disabled={busyId === listing.id} className="reject-button" onClick={() => review(listing, "rejected")}>Reject</button></>}{listing.status === "active" && <button disabled={busyId === listing.id} className="reject-button" onClick={() => review(listing, "removed")}>{busyId === listing.id ? "Taking down…" : "Take down listing"}</button>}</div></div>}
      </article>;
    })}</div></>}
  </section></div>;
}

export default AdminDashboard;
