import { useEffect, useState } from "react";
import { apiBase } from "../services/listings";

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function RequestInbox({ onClose, onRead }) {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(`${apiBase}/api/owner/requests`, { credentials: "include" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load your requests.");
        if (!active) return;
        setRequests(data.requests);
        const unreadOnPage = data.requests.filter((request) => !request.readAt).length;
        const sales = data.requests.filter((request) => request.type === "sale").map((request) => request.id);
        const rentals = data.requests.filter((request) => request.type === "rent").map((request) => request.id);
        const readResponse = await fetch(`${apiBase}/api/owner/requests/read`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sales, rentals }),
        });
        if (readResponse.ok) {
          const readAt = new Date().toISOString();
          setRequests((current) => current.map((request) => ({ ...request, readAt: request.readAt || readAt })));
          onRead(Math.max(0, data.unreadCount - unreadOnPage));
        }
      } catch (requestError) {
        if (active) setError(requestError.message === "Failed to fetch" ? "The request service is unavailable." : requestError.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [onRead]);

  return <div className="modal-backdrop" role="presentation" onClick={onClose}><section className="request-inbox" role="dialog" aria-modal="true" aria-labelledby="request-inbox-title" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Close">×</button><p className="eyebrow">SELLER & RENTAL DASHBOARD</p><h2 id="request-inbox-title">Requests for your cars</h2><p className="request-inbox-intro">View interested buyers and rental requests, then contact them directly.</p>{loading && <p className="request-inbox-state">Loading your requests…</p>}{error && <p className="auth-error" role="alert">{error}</p>}{!loading && !error && requests.length === 0 && <div className="request-inbox-empty"><span>✳</span><h3>No requests yet</h3><p>When someone is interested in one of your cars, their contact details will appear here.</p></div>}{!loading && requests.length > 0 && <div className="request-list">{requests.map((request) => <article className={`request-card${request.readAt ? "" : " is-unread"}`} key={`${request.type}-${request.id}`}><div className="request-card-head"><span className={`request-type request-type-${request.type}`}>{request.type === "sale" ? "BUYER INTEREST" : "RENTAL REQUEST"}</span>{!request.readAt && <span className="request-new">NEW</span>}</div><h3>{request.listingTitle}</h3>{request.type === "rent" && <p className="request-dates">Requested {formatDate(request.startsAt)} – {formatDate(request.endsAt)}</p>}<p className="request-from">{request.type === "sale" ? "Interested buyer" : "Prospective renter"} · {formatDate(request.createdAt)}</p><div className="request-contact-links"><a href={`mailto:${request.requesterEmail}`}>Email {request.requesterEmail}</a>{request.requesterPhone && <a href={`tel:${request.requesterPhone}`}>Call {request.requesterPhone}</a>}</div>{request.message && <p className="request-message">“{request.message}”</p>}</article>)}</div>}<div className="request-inbox-footer"><button className="button button-outline" onClick={onClose}>Close</button></div></section></div>;
}

export default RequestInbox;
