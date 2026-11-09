import { useEffect, useRef, useState } from "react";
import { apiBase } from "../services/listings";

const initial = { title: "", description: "", make: "", model: "", year: new Date().getFullYear(), location: "", transmission: "Automatic", fuel: "Petrol", body: "Sedan", price: "", type: "sale", contactEmail: "", contactPhone: "" };
const maxPhotos = 10;
const maxPhotoBytes = 8 * 1024 * 1024;
const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
const requiredViews = ["front", "rear", "interior"];
const viewLabels = { front: "Front view", rear: "Rear view", interior: "Interior", other: "Other view" };

function ListingForm({ onClose, onSuccess, initialType = "sale", user }) {
  const [form, setForm] = useState(() => ({ ...initial, type: initialType, contactEmail: user?.email || "" }));
  const [photos, setPhotos] = useState([]);
  const photosRef = useRef(photos);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(() => () => {
    photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
  }, []);

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  function selectPhotos(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    const remaining = maxPhotos - photos.length;
    if (remaining <= 0) {
      setError(`You can add up to ${maxPhotos} photos.`);
      return;
    }
    const accepted = [];
    const assignedViews = new Set(photos.map((photo) => photo.view));
    let selectionError = "";

    for (const file of files.slice(0, remaining)) {
      if (!allowedTypes.includes(file.type)) {
        selectionError = "Choose JPG, PNG, or WebP photos.";
        continue;
      }
      if (file.size > maxPhotoBytes) {
        selectionError = "Each photo must be 8 MB or smaller.";
        continue;
      }
      const view = requiredViews.find((candidate) => !assignedViews.has(candidate)) || "other";
      assignedViews.add(view);
      accepted.push({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file), view, secureUrl: "", status: "ready" });
    }
    if (files.length > remaining) selectionError = `You can add up to ${maxPhotos} photos.`;
    if (accepted.length) setPhotos((current) => [...current, ...accepted]);
    setError(selectionError);
  }

  function updatePhoto(id, patch) {
    setPhotos((current) => current.map((photo) => photo.id === id ? { ...photo, ...patch } : photo));
  }

  function removePhoto(photo) {
    URL.revokeObjectURL(photo.previewUrl);
    setPhotos((current) => current.filter((item) => item.id !== photo.id));
    setError("");
  }

  async function getUploadCredentials(imageId) {
    const response = await fetch(`${apiBase}/api/media/signature`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not prepare photo uploads.");
    return data;
  }

  async function uploadPhoto(photo, credentials) {
    const upload = new FormData();
    upload.append("file", photo.file);
    upload.append("public_id", credentials.publicId);
    upload.append("api_key", credentials.apiKey);
    upload.append("timestamp", String(credentials.timestamp));
    upload.append("folder", credentials.folder);
    upload.append("allowed_formats", credentials.allowedFormats);
    upload.append("signature", credentials.signature);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${credentials.cloudName}/image/upload`, { method: "POST", body: upload });
    const data = await response.json();
    if (!response.ok || !data.secure_url) throw new Error(data.error?.message || "A photo could not be uploaded. Please try again.");
    return data.secure_url;
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (photos.length < 3) {
      setError("Add at least three photos: front, rear, and interior views.");
      return;
    }
    const missingView = requiredViews.find((view) => !photos.some((photo) => photo.view === view));
    if (missingView) {
      setError(`Please label one photo as the ${viewLabels[missingView].toLowerCase()}.`);
      return;
    }

    setBusy(true);
    try {

      const uploadedPhotos = [];

      for (let index = 0; index < photos.length; index += 1) {
        const photo = photos[index];
        if (photo.secureUrl) {
          uploadedPhotos.push({ url: photo.secureUrl, view: photo.view });
          continue;
        }
        setUploadMessage(`Uploading photo ${index + 1} of ${photos.length}…`);
        updatePhoto(photo.id, { status: "uploading" });
        const credentials = await getUploadCredentials(photo.id);
        const secureUrl = await uploadPhoto(photo, credentials);
        uploadedPhotos.push({ url: secureUrl, view: photo.view });
        updatePhoto(photo.id, { secureUrl, status: "uploaded" });
      }

      setUploadMessage("Publishing your listing…");
      const response = await fetch(`${apiBase}/api/listings`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, year: Number(form.year), price: Number(form.price), images: uploadedPhotos }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create listing.");
      onSuccess();
    } catch (requestError) {
      setError(requestError.message === "Failed to fetch" ? "The listing or photo service is unavailable. Please try again later." : requestError.message);
    } finally {
      setBusy(false);
      setUploadMessage("");
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => { if (!busy) onClose(); }}>
      <section className="listing-modal" role="dialog" aria-modal="true" aria-labelledby="listing-title" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" disabled={busy} onClick={onClose} aria-label="Close">×</button>
        <p className="eyebrow">SHARE YOUR VEHICLE</p>
        <h2 id="listing-title">Create a listing</h2>
        <p className="listing-intro">Add clear photos and details. Your car will appear in the marketplace after you submit.</p>
        <form className="listing-form" onSubmit={submit}>
          <label className="wide">Listing title<input name="title" required minLength="3" maxLength="100" placeholder="2022 Toyota Camry SE" value={form.title} onChange={update} /></label>
          <label>Make<input name="make" required maxLength="60" value={form.make} onChange={update} /></label>
          <label>Model<input name="model" required maxLength="60" value={form.model} onChange={update} /></label>
          <label>Year<input name="year" type="number" min="1980" max={new Date().getFullYear() + 1} required value={form.year} onChange={update} /></label>
          <label>City or region<input name="location" required minLength="2" maxLength="100" placeholder="Accra" value={form.location} onChange={update} /></label>
          <label>Transmission<select name="transmission" value={form.transmission} onChange={update}><option>Automatic</option><option>Manual</option></select></label>
          <label>Fuel<select name="fuel" value={form.fuel} onChange={update}><option>Petrol</option><option>Diesel</option><option>Hybrid</option><option>Electric</option></select></label>
          <label>Body type<input name="body" required minLength="2" maxLength="40" placeholder="SUV" value={form.body} onChange={update} /></label>
          <label>Listing type<select name="type" value={form.type} onChange={update}><option value="sale">For sale</option><option value="rent">For rent</option></select></label>
          <label className="wide">Price (GH₵{form.type === "rent" ? " per day" : ""})<input name="price" type="number" min="1" step="0.01" required value={form.price} onChange={update} /></label>
          <div className="listing-photo-field wide">
            <div className="listing-photo-heading">
              <label htmlFor="listing-photos">Car photos</label>
              <span className={photos.length >= 3 ? "photo-count is-ready" : "photo-count"}>{photos.length} / {maxPhotos}</span>
            </div>
            <p className="photo-help">Add at least 3 photos: front, rear, and interior. You can add up to {maxPhotos} photos.</p>
            <label className="photo-picker">
              <input id="listing-photos" className="photo-file-input" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy || photos.length >= maxPhotos} onChange={selectPhotos} />
              <span className="photo-picker-icon" aria-hidden="true">＋</span>
              <span><strong>Choose photos from this device</strong><small>Pick from your phone or computer · JPG, PNG, or WebP · up to 8 MB each</small></span>
            </label>
            {photos.length > 0 && (
              <div className="listing-photo-grid">
                {photos.map((photo, index) => (
                  <article className="listing-photo-card" key={photo.id}>
                    <img src={photo.previewUrl} alt={`${viewLabels[photo.view]} of the car`} />
                    <div className="listing-photo-card-controls">
                      <label className="photo-view-label" htmlFor={`photo-view-${photo.id}`}>Photo {index + 1}</label>
                      <select id={`photo-view-${photo.id}`} value={photo.view} disabled={busy} onChange={(event) => updatePhoto(photo.id, { view: event.target.value })} aria-label={`Photo ${index + 1} view`}>
                        {Object.entries(viewLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      <button type="button" className="photo-remove" disabled={busy} onClick={() => removePhoto(photo)} aria-label={`Remove photo ${index + 1}`}>Remove</button>
                    </div>
                    {photo.status === "uploaded" && <span className="photo-uploaded">Uploaded</span>}
                  </article>
                ))}
              </div>
            )}
          </div>
          <label className="wide">Description<textarea name="description" rows="3" maxLength="4000" placeholder="Tell buyers or renters about the car’s condition, features, and anything else they should know." value={form.description} onChange={update} /></label>
          <p className="listing-legal-help wide">Include all important fees and terms. Where required by law, provide your legal name and status, business or service address, and contact details, plus the sale handover or rental, cancellation, return, and refund conditions that apply. Do not include identity numbers or passwords.</p>
          <div className="listing-contact-heading wide"><strong>Your contact details</strong><span>Interested buyers or renters can reach you. We’ll email you when someone contacts you.</span></div>
          <label>Contact email<input name="contactEmail" type="email" required maxLength="254" autoComplete="email" value={form.contactEmail} onChange={update} /></label>
          <label>Contact phone<input name="contactPhone" type="tel" required minLength="7" maxLength="20" autoComplete="tel" placeholder="+233 20 123 4567" value={form.contactPhone} onChange={update} /></label>
          {uploadMessage && <p className="listing-upload-status wide" role="status">{uploadMessage}</p>}
          {error && <p className="listing-error wide" role="alert">{error}</p>}
          <div className="listing-submit wide">
            <button type="button" className="button button-outline" disabled={busy} onClick={onClose}>Cancel</button>
            <button className="button button-primary" disabled={busy}>{busy ? "Working…" : "Publish listing"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default ListingForm;
