import express from "express";
import { createHash, randomBytes } from "node:crypto";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { fileURLToPath } from "node:url";
import { pool, query } from "./db.js";
import { bookingSchema, credentialsSchema, emailSchema, inquirySchema, listingSchema, resetPasswordSchema } from "./validation.js";
import { clearSession, issueSession, requireAdmin, requireAuth } from "./security.js";

export const app = express();
const isProduction = process.env.NODE_ENV === "production";
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const allowedOrigins = new Set([frontendOrigin, "http://localhost:5173", "http://127.0.0.1:5173"]);
const originAllowed = (origin, req) => isProduction ? origin === `${req.protocol}://${req.get("host")}` : Boolean(origin && allowedOrigins.has(origin));
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false, message: { error: "Too many attempts. Try again shortly." } });
const apiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false });
const imageSignatureLimiter = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false });
const inquiryLimiter = rateLimit({ windowMs: 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false });
const CURRENT_TERMS_VERSION = "autohub-terms-2026-11-09-v1";
async function logSiteActivity({ eventType, actorId = null, listingId = null, summary, details = {}, isNotification = false }, client = pool) {
  try {
    await client.query(
      "INSERT INTO site_activity_events (event_type,actor_id,listing_id,summary,details,is_notification) VALUES ($1,$2,$3,$4,$5::jsonb,$6)",
      [eventType, actorId, listingId, summary, JSON.stringify(details), isNotification],
    );
  } catch (error) { console.error("Could not record AutoHub activity", error); }
}
async function requireCurrentTerms(req, res, next) {
  try {
    const result = await query("SELECT terms_version FROM users WHERE id=$1", [req.auth.sub]);
    if (!result.rows[0]) return res.status(401).json({ error: "Account no longer exists." });
    if (result.rows[0].terms_version !== CURRENT_TERMS_VERSION) return res.status(428).json({ error: "Read and accept the current AutoHub Terms and Conditions to continue.", termsVersion: CURRENT_TERMS_VERSION });
    return next();
  } catch (error) { return next(error); }
}

async function sendOwnerEmail({ to, subject, text }) {
  const { RESEND_API_KEY: apiKey, EMAIL_FROM: emailFrom } = process.env;
  if (!apiKey || !emailFrom || !to) return false;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({ from: emailFrom, to: [to], subject, text }),
    });
    return response.ok;
  } catch { return false; }
}

async function deleteListingPhotos(images, ownerId) {
  if (!images.length) return true;
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = process.env;
  if (!cloudName || !apiKey || !apiSecret) return false;
  const publicIds = images.map(({ url }) => {
    try {
      const pathname = new URL(url).pathname;
      const prefix = `/${cloudName}/image/upload/`;
      if (!pathname.startsWith(prefix)) return null;
      const segments = pathname.slice(prefix.length).split("/");
      const folderIndex = segments.indexOf("autohub");
      if (folderIndex < 0 || segments[folderIndex + 1] !== "listings" || segments[folderIndex + 2] !== ownerId || segments.length !== folderIndex + 4) return null;
      const imageId = segments[folderIndex + 3].replace(/\.[a-zA-Z0-9]+$/, "");
      if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(imageId)) return null;
      return `autohub/listings/${ownerId}/${imageId}`;
    } catch { return null; }
  });
  if (publicIds.some((publicId) => !publicId)) return false;
  const results = await Promise.all(publicIds.map(async (publicId) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHash("sha1").update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`).digest("hex");
    const form = new FormData();
    form.set("public_id", publicId);
    form.set("timestamp", String(timestamp));
    form.set("api_key", apiKey);
    form.set("signature", signature);
    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, { method: "POST", body: form, signal: AbortSignal.timeout(10_000) });
      if (!response.ok) return false;
      const data = await response.json();
      return data.result === "ok" || data.result === "not found";
    } catch { return false; }
  }));
  return results.every(Boolean);
}

app.disable("x-powered-by");
app.set("trust proxy", 1);
const contentSecurityPolicy = {
  ...helmet.contentSecurityPolicy.getDefaultDirectives(),
  "img-src": ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https://images.unsplash.com"],
  "connect-src": ["'self'", "https://api.cloudinary.com"],
};
app.use(helmet({ contentSecurityPolicy: { directives: contentSecurityPolicy } }));
app.use(cors({ origin: (origin, callback) => callback(null, !isProduction && (!origin || allowedOrigins.has(origin))), credentials: true, methods: ["GET", "POST", "PATCH", "DELETE"] }));
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());
app.use(apiLimiter);

app.use((req, res, next) => {
  if (["POST", "PATCH", "DELETE"].includes(req.method) && !originAllowed(req.get("origin"), req)) {
    return res.status(403).json({ error: "Request origin is not allowed." });
  }
  next();
});

app.get("/api/health", async (_req, res, next) => {
  try { await query("SELECT 1"); res.json({ status: "ok" }); } catch (error) { next(error); }
});
app.get("/api/legal/terms", (_req, res) => res.json({
  version: CURRENT_TERMS_VERSION,
  operator: {
    name: process.env.OPERATOR_LEGAL_NAME || "",
    status: process.env.OPERATOR_LEGAL_STATUS || "",
    address: process.env.OPERATOR_ADDRESS || "",
    phone: process.env.SUPPORT_PHONE || "",
    email: process.env.SUPPORT_EMAIL || "",
    website: process.env.APP_URL || process.env.FRONTEND_ORIGIN || ""
  }
}));

app.post("/api/auth/register", authLimiter, async (req, res, next) => {
  try {
    const { email, password } = credentialsSchema.parse(req.body);
    if (req.body.termsAccepted !== true || req.body.termsVersion !== CURRENT_TERMS_VERSION) return res.status(428).json({ error: "Read and accept the current AutoHub Terms and Conditions before creating an account.", termsVersion: CURRENT_TERMS_VERSION });
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query("INSERT INTO users (email, password_hash, terms_version, terms_accepted_at) VALUES ($1, $2, $3, NOW()) RETURNING id, email, role, terms_version AS \"termsVersion\"", [email, passwordHash, CURRENT_TERMS_VERSION]);
    issueSession(res, result.rows[0]);
    await logSiteActivity({ eventType: "account.created", actorId: result.rows[0].id, summary: "A new account was created." });
    res.status(201).json({ user: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "An account with that email already exists." });
    next(error);
  }
});

app.post("/api/auth/login", authLimiter, async (req, res, next) => {
  try {
    const { email, password } = credentialsSchema.parse(req.body);
    const result = await query("SELECT id, email, role, password_hash, terms_version AS \"termsVersion\" FROM users WHERE email = $1", [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: "Email or password is incorrect." });
    issueSession(res, user);
    await logSiteActivity({ eventType: "account.signed_in", actorId: user.id, summary: "An account signed in." });
    res.json({ user: { id: user.id, email: user.email, role: user.role, termsVersion: user.termsVersion } });
  } catch (error) { next(error); }
});

app.post("/api/auth/forgot-password", authLimiter, async (req, res, next) => {
  try {
    const { email } = emailSchema.parse(req.body);
    const { RESEND_API_KEY: resendApiKey, EMAIL_FROM: emailFrom } = process.env;
    if (!resendApiKey || !emailFrom) return res.status(503).json({ error: "Password reset email is not configured yet." });

    const genericMessage = "If an account uses that email, we’ll send a password reset link shortly.";
    const account = await query("SELECT id FROM users WHERE email = $1", [email]);
    if (account.rows[0]) {
      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      await query(
        "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 minutes') ON CONFLICT (user_id) DO UPDATE SET token_hash = EXCLUDED.token_hash, expires_at = EXCLUDED.expires_at, created_at = NOW()",
        [account.rows[0].id, tokenHash],
      );
      const appUrl = (process.env.APP_URL || frontendOrigin).replace(/\/$/, "");
      const resetUrl = new URL("/", appUrl);
      resetUrl.searchParams.set("resetToken", token);
      void fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10_000),
        body: JSON.stringify({
          from: emailFrom,
          to: [email],
          subject: "Reset your AutoHub password",
          text: `We received a request to reset your AutoHub password. Use this link within 30 minutes: ${resetUrl.href}\n\nIf you did not request this, you can ignore this email.`,
          html: `<p>We received a request to reset your AutoHub password.</p><p><a href="${resetUrl.href}">Choose a new password</a></p><p>This link expires in 30 minutes. If you did not request this, you can ignore this email.</p>`,
        }),
      }).then((emailResponse) => {
        if (!emailResponse.ok) throw new Error("Email provider rejected the reset email.");
      }).catch(async () => {
        try { await query("DELETE FROM password_reset_tokens WHERE user_id = $1", [account.rows[0].id]); } catch {}
        console.error("Password reset email could not be delivered.");
      });
    }
    res.status(202).json({ message: genericMessage });
  } catch (error) { next(error); }
});

app.post("/api/auth/reset-password", authLimiter, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await client.query("BEGIN");
    const reset = await client.query(
      "SELECT user_id FROM password_reset_tokens WHERE token_hash = $1 AND expires_at > NOW() FOR UPDATE",
      [tokenHash],
    );
    if (!reset.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "That password reset link is invalid or has expired. Request a new one." });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await client.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, reset.rows[0].user_id]);
    await client.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [reset.rows[0].user_id]);
    await client.query("COMMIT");
    clearSession(res);
    res.json({ message: "Your password has been changed. Sign in with your new password." });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally { client.release(); }
});

app.post("/api/auth/logout", (_req, res) => { clearSession(res); res.status(204).end(); });
app.post("/api/legal/accept-terms", requireAuth, async (req, res, next) => {
  try {
    const accepted = z.object({ accepted: z.literal(true), termsVersion: z.literal(CURRENT_TERMS_VERSION) }).parse(req.body);
    const result = await query('UPDATE users SET terms_version=$1, terms_accepted_at=NOW() WHERE id=$2 RETURNING id, email, role, terms_version AS "termsVersion", terms_accepted_at AS "termsAcceptedAt"', [accepted.termsVersion, req.auth.sub]);
    if (!result.rows[0]) return res.status(401).json({ error: "Account no longer exists." });
    await logSiteActivity({ eventType: "terms.accepted", actorId: req.auth.sub, summary: "Current Terms and Conditions were accepted." });
    res.json({ user: result.rows[0] });
  } catch (error) { next(error); }
});
app.get("/api/auth/me", requireAuth, async (req, res, next) => {
  try {
    const result = await query('SELECT id, email, role, created_at, terms_version AS "termsVersion", terms_accepted_at AS "termsAcceptedAt" FROM users WHERE id = $1', [req.auth.sub]);
    if (!result.rows[0]) return res.status(401).json({ error: "Account no longer exists." });
    res.json({ user: result.rows[0] });
  } catch (error) { next(error); }
});

app.post("/api/media/signature", requireAuth, requireCurrentTerms, imageSignatureLimiter, (req, res) => {
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = process.env;
  if (!cloudName || !apiKey || !apiSecret) return res.status(503).json({ error: "Car photo uploads are not configured yet." });

  const { imageId } = z.object({ imageId: z.string().uuid() }).parse(req.body);
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `autohub/listings/${req.auth.sub}`;
  const allowedFormats = "jpg,jpeg,png,webp";
  const params = { allowed_formats: allowedFormats, folder, public_id: imageId, timestamp };
  const toSign = Object.entries(params).sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}=${value}`).join("&");
  const signature = createHash("sha1").update(`${toSign}${apiSecret}`).digest("hex");
  res.json({ cloudName, apiKey, timestamp, folder, allowedFormats, publicId: imageId, signature });
});
app.get("/api/listings", requireAuth, requireCurrentTerms, async (req, res, next) => {
  try {
    const params = z.object({ type: z.enum(["sale", "rent"]).optional(), search: z.string().trim().max(80).optional(), location: z.string().trim().max(100).optional(), maxPrice: z.coerce.number().positive().optional(), sort: z.enum(["price_asc", "price_desc", "newest"]).default("newest"), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(48).default(12) }).parse(req.query);
    const filters = ["status = 'active'"];
    const values = [];
    const add = (expression, value) => { values.push(value); filters.push(expression.replace("?", `$${values.length}`)); };
    if (params.type) add("type = ?", params.type);
    if (params.search) {
      values.push(`%${params.search}%`);
      const placeholder = `$${values.length}`;
      filters.push(`(title ILIKE ${placeholder} OR make ILIKE ${placeholder} OR model ILIKE ${placeholder})`);
    }
    if (params.location) add("location ILIKE ?", `%${params.location}%`);
    if (params.maxPrice) add("price <= ?", params.maxPrice);
    const order = { price_asc: "price ASC", price_desc: "price DESC", newest: "created_at DESC" }[params.sort];
    const offset = (params.page - 1) * params.pageSize;
    const sql = `SELECT id, title, description, make, model, year, location, transmission, fuel, body, price, type, image_url AS "imageUrl", images, created_at FROM listings WHERE ${filters.join(" AND ")} ORDER BY ${order} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    const result = await query(sql, [...values, params.pageSize, offset]);
    const count = await query(`SELECT COUNT(*)::int AS total FROM listings WHERE ${filters.join(" AND ")}`, values);
    res.json({ listings: result.rows, total: count.rows[0].total, page: params.page, pageSize: params.pageSize });
  } catch (error) { next(error); }
});

app.post("/api/listings", requireAuth, requireCurrentTerms, async (req, res, next) => {
  try {
    const listing = listingSchema.parse(req.body);
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (!cloudName) return res.status(503).json({ error: "Car photo uploads are not configured yet." });
    const expectedPrefix = `/${cloudName}/image/upload/`;
    const allImagesFromCloudinary = listing.images.every(({ url }) => {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname === "res.cloudinary.com" && parsedUrl.pathname.startsWith(expectedPrefix);
    });
    if (!allImagesFromCloudinary) return res.status(400).json({ error: "Select and upload your car photos before submitting." });
    const viewOrder = { front: 0, rear: 1, interior: 2, other: 3 };
    const listingImages = [...listing.images].sort((left, right) => viewOrder[left.view] - viewOrder[right.view]);
    const imageUrl = listingImages[0].url;
    const result = await query("INSERT INTO listings (owner_id,title,description,make,model,year,location,transmission,fuel,body,price,type,image_url,images,contact_email,contact_phone,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16,'active') RETURNING *", [req.auth.sub, listing.title, listing.description, listing.make, listing.model, listing.year, listing.location, listing.transmission, listing.fuel, listing.body, listing.price, listing.type, imageUrl, JSON.stringify(listingImages), listing.contactEmail, listing.contactPhone]);
    await logSiteActivity({ eventType: "listing.created", actorId: req.auth.sub, listingId: result.rows[0].id, summary: `A ${listing.type === "sale" ? "sale" : "rental"} vehicle was listed: ${listing.title}.`, details: { title: listing.title, type: listing.type }, isNotification: true });
    res.status(201).json({ listing: result.rows[0] });
  } catch (error) { next(error); }
});

app.post("/api/listings/:id/inquiries", requireAuth, requireCurrentTerms, inquiryLimiter, async (req, res, next) => {
  try {
    const inquiry = inquirySchema.parse(req.body);
    const listingId = z.string().uuid().parse(req.params.id);
    const listing = await query(
      "SELECT l.id,l.title,l.owner_id,COALESCE(l.contact_email,owner.email) AS contact_email,l.contact_phone,buyer.email AS buyer_email FROM listings l JOIN users owner ON owner.id=l.owner_id JOIN users buyer ON buyer.id=$2 WHERE l.id=$1 AND l.type='sale' AND l.status='active'",
      [listingId, req.auth.sub],
    );
    const car = listing.rows[0];
    if (!car || car.owner_id === req.auth.sub) return res.status(404).json({ error: "Car listing was not found." });
    const saved = await query(
      "INSERT INTO listing_inquiries (listing_id,buyer_id,buyer_phone,message) VALUES ($1,$2,$3,$4) RETURNING id,created_at",
      [car.id, req.auth.sub, inquiry.phone, inquiry.message],
    );
    await logSiteActivity({ eventType: "sale.inquiry", actorId: req.auth.sub, listingId: car.id, summary: `A buyer sent an inquiry for ${car.title}.`, details: { title: car.title, type: "sale" }, isNotification: true });
    const notificationSent = await sendOwnerEmail({
      to: car.contact_email,
      subject: `New interest in ${car.title.replace(/[\r\n]+/g, " ").slice(0, 100)}`,
      text: `Someone is interested in your car listing: ${car.title}\n\nBuyer email: ${car.buyer_email}\nBuyer phone: ${inquiry.phone}\nMessage: ${inquiry.message || "No message included."}\n\nSign in to AutoHub to view your listing.`,
    });
    res.status(201).json({ inquiry: saved.rows[0], notificationSent, sellerContact: { email: car.contact_email, phone: car.contact_phone } });
  } catch (error) { next(error); }
});

app.get("/api/owner/listings", requireAuth, requireCurrentTerms, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT l.id,l.title,l.make,l.model,l.year,l.location,l.price,l.type,l.status,l.image_url AS "imageUrl",l.images,l.created_at AS "createdAt",latest.reason AS "moderationReason"
       FROM listings l
       LEFT JOIN LATERAL (SELECT reason FROM listing_moderation_events WHERE listing_id=l.id ORDER BY created_at DESC LIMIT 1) latest ON true
       WHERE l.owner_id=$1 ORDER BY l.created_at DESC`,
      [req.auth.sub],
    );
    res.json({ listings: result.rows });
  } catch (error) { next(error); }
});

app.patch("/api/owner/listings/:id/status", requireAuth, requireCurrentTerms, async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const { action } = z.object({ action: z.enum(["take_down", "restore", "complete"]) }).parse(req.body);
    const updated = await query(
      `UPDATE listings
       SET status=CASE WHEN $3='take_down' THEN 'paused' WHEN $3='restore' THEN 'active' WHEN type='sale' THEN 'sold' ELSE 'rented' END, updated_at=NOW()
       WHERE id=$1 AND owner_id=$2 AND (($3='take_down' AND status='active') OR ($3='restore' AND status='paused') OR ($3='complete' AND status='active'))
       RETURNING id,type,status,title`,
      [id, req.auth.sub, action],
    );
    if (updated.rows[0]) {
      const row = updated.rows[0];
      const eventType = action === "complete" ? (row.type === "sale" ? "vehicle.sold" : "vehicle.rented") : action === "take_down" ? "listing.paused" : "listing.restored";
      const verb = action === "complete" ? (row.type === "sale" ? "marked sold" : "marked rented") : action === "take_down" ? "taken down by its owner" : "restored by its owner";
      await logSiteActivity({ eventType, actorId: req.auth.sub, listingId: row.id, summary: `A vehicle was ${verb}: ${row.title}.`, details: { title: row.title, type: row.type }, isNotification: action === "complete" });
      return res.json({ listing: row });
    }
    const existing = await query("SELECT type FROM listings WHERE id=$1 AND owner_id=$2", [id, req.auth.sub]);
    if (!existing.rows[0]) return res.status(404).json({ error: "Listing not found." });
    const noun = existing.rows[0].type === "sale" ? "sale" : "rental";
    res.status(409).json({ error: `This ${noun} listing cannot perform that action in its current status.` });
  } catch (error) { next(error); }
});

app.delete("/api/owner/listings/:id", requireAuth, requireCurrentTerms, async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const listing = await query("SELECT id,title,type,images,image_url AS \"imageUrl\" FROM listings WHERE id=$1 AND owner_id=$2", [id, req.auth.sub]);
    if (!listing.rows[0]) return res.status(404).json({ error: "Listing not found." });
    const images = Array.isArray(listing.rows[0].images) ? listing.rows[0].images : [];
    const imageRecords = images.length ? images : listing.rows[0].imageUrl ? [{ url: listing.rows[0].imageUrl }] : [];
    const deleted = await query("DELETE FROM listings WHERE id=$1 AND owner_id=$2 RETURNING id,type", [id, req.auth.sub]);
    if (!deleted.rows[0]) return res.status(404).json({ error: "Listing not found." });
    await logSiteActivity({ eventType: "listing.deleted", actorId: req.auth.sub, summary: `A vehicle listing was deleted: ${listing.rows[0].title}.`, details: { title: listing.rows[0].title, type: listing.rows[0].type } });
    const imagesRemoved = await deleteListingPhotos(imageRecords, req.auth.sub);
    res.json({ deleted: deleted.rows[0], imagesRemoved });
  } catch (error) { next(error); }
});

app.get("/api/owner/requests", requireAuth, requireCurrentTerms, async (req, res, next) => {
  try {
    const [requests, unread] = await Promise.all([
      query(
        `SELECT i.id,'sale'::text AS type,l.id AS "listingId",l.title AS "listingTitle",buyer.email AS "requesterEmail",i.buyer_phone AS "requesterPhone",i.message,NULL::timestamptz AS "startsAt",NULL::timestamptz AS "endsAt",i.created_at AS "createdAt",i.owner_viewed_at AS "readAt"
         FROM listing_inquiries i JOIN listings l ON l.id=i.listing_id JOIN users buyer ON buyer.id=i.buyer_id
         WHERE l.owner_id=$1
         UNION ALL
         SELECT b.id,'rent'::text,l.id AS "listingId",l.title AS "listingTitle",renter.email AS "requesterEmail",b.renter_phone AS "requesterPhone",NULL::text AS message,b.starts_at AS "startsAt",b.ends_at AS "endsAt",b.created_at AS "createdAt",b.owner_viewed_at AS "readAt"
         FROM bookings b JOIN listings l ON l.id=b.listing_id JOIN users renter ON renter.id=b.renter_id
         WHERE l.owner_id=$1
         ORDER BY "createdAt" DESC LIMIT 50`,
        [req.auth.sub],
      ),
      query(
        `SELECT EXISTS(SELECT 1 FROM listings WHERE owner_id=$1) AS "hasListings",
                ((SELECT COUNT(*) FROM listing_inquiries i JOIN listings l ON l.id=i.listing_id WHERE l.owner_id=$1 AND i.owner_viewed_at IS NULL) +
                 (SELECT COUNT(*) FROM bookings b JOIN listings l ON l.id=b.listing_id WHERE l.owner_id=$1 AND b.owner_viewed_at IS NULL))::int AS "unreadCount"`,
        [req.auth.sub],
      ),
    ]);
    res.json({ requests: requests.rows, unreadCount: unread.rows[0].unreadCount, hasListings: unread.rows[0].hasListings });
  } catch (error) { next(error); }
});

app.post("/api/owner/requests/read", requireAuth, requireCurrentTerms, async (req, res, next) => {
  try {
    const { sales, rentals } = z.object({ sales: z.array(z.string().uuid()).max(50), rentals: z.array(z.string().uuid()).max(50) }).parse(req.body);
    if (sales.length) await query(
      "UPDATE listing_inquiries i SET owner_viewed_at=NOW() FROM listings l WHERE l.id=i.listing_id AND l.owner_id=$1 AND i.id=ANY($2::uuid[]) AND i.owner_viewed_at IS NULL",
      [req.auth.sub, sales],
    );
    if (rentals.length) await query(
      "UPDATE bookings b SET owner_viewed_at=NOW() FROM listings l WHERE l.id=b.listing_id AND l.owner_id=$1 AND b.id=ANY($2::uuid[]) AND b.owner_viewed_at IS NULL",
      [req.auth.sub, rentals],
    );
    res.status(204).end();
  } catch (error) { next(error); }
});

app.post("/api/bookings", requireAuth, requireCurrentTerms, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const booking = bookingSchema.parse(req.body);
    const start = new Date(booking.startsAt);
    const end = new Date(booking.endsAt);
    if (start <= new Date() || end <= start) return res.status(400).json({ error: "Choose a future end date after the start date." });
    await client.query("BEGIN");
    const listing = await client.query("SELECT l.id,l.owner_id,l.title,COALESCE(l.contact_email,owner.email) AS contact_email,l.contact_phone FROM listings l JOIN users owner ON owner.id=l.owner_id WHERE l.id=$1 AND l.type='rent' AND l.status='active' FOR UPDATE OF l", [booking.listingId]);
    if (!listing.rows[0] || listing.rows[0].owner_id === req.auth.sub) { await client.query("ROLLBACK"); return res.status(404).json({ error: "Rental listing was not found." }); }
    const conflict = await client.query("SELECT 1 FROM bookings WHERE listing_id=$1 AND status IN ('requested','confirmed') AND starts_at < $3 AND ends_at > $2", [booking.listingId, start, end]);
    if (conflict.rowCount) { await client.query("ROLLBACK"); return res.status(409).json({ error: "Those dates are not available." }); }
    const renter = await client.query("SELECT email FROM users WHERE id=$1", [req.auth.sub]);
    const created = await client.query("INSERT INTO bookings (listing_id,renter_id,starts_at,ends_at,renter_phone) VALUES ($1,$2,$3,$4,$5) RETURNING id,listing_id,starts_at,ends_at,status,renter_phone", [booking.listingId, req.auth.sub, start, end, booking.phone]);
    await client.query("COMMIT");
    const car = listing.rows[0];
    await logSiteActivity({ eventType: "rental.requested", actorId: req.auth.sub, listingId: car.id, summary: `A rental was requested for ${car.title}.`, details: { title: car.title, type: "rent" }, isNotification: true });
    const notificationSent = await sendOwnerEmail({
      to: car.contact_email,
      subject: `New rental request for ${car.title.replace(/[\r\n]+/g, " ").slice(0, 100)}`,
      text: `Someone requested to rent your car: ${car.title}\n\nRenter email: ${renter.rows[0]?.email || "Unavailable"}\nRenter phone: ${booking.phone}\nRequested from: ${start.toISOString()}\nRequested until: ${end.toISOString()}\n\nSign in to AutoHub to review the request.`,
    });
    res.status(201).json({ booking: created.rows[0], notificationSent, sellerContact: { email: car.contact_email, phone: car.contact_phone } });
  } catch (error) { await client.query("ROLLBACK"); next(error); } finally { client.release(); }
});

app.get("/api/admin/overview", requireAuth, requireCurrentTerms, requireAdmin, async (_req, res, next) => {
  try {
    const result = await query(`SELECT
      (SELECT COUNT(*) FROM listings)::int AS "totalVehicles",
      (SELECT COUNT(*) FROM listings WHERE status='active')::int AS "availableVehicles",
      (SELECT COUNT(*) FROM listings WHERE status='sold')::int AS "soldVehicles",
      (SELECT COUNT(*) FROM listings WHERE status='rented')::int AS "rentedVehicles",
      (SELECT COUNT(*) FROM listings WHERE status='pending')::int AS "pendingReview",
      (SELECT COUNT(*) FROM listings WHERE status IN ('removed','rejected'))::int AS "moderatedVehicles",
      (SELECT COUNT(*) FROM users)::int AS "accounts",
      (SELECT COUNT(*) FROM listing_inquiries)::int AS "saleInquiries",
      (SELECT COUNT(*) FROM bookings)::int AS "rentalRequests",
      (SELECT COUNT(*) FROM site_activity_events)::int AS "activityEvents"`);
    res.json({ overview: result.rows[0] });
  } catch (error) { next(error); }
});

app.get("/api/admin/activity", requireAuth, requireCurrentTerms, requireAdmin, async (req, res, next) => {
  try {
    const { page, pageSize } = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(30) }).parse(req.query);
    const [events, total] = await Promise.all([
      query(`SELECT e.id,e.event_type AS "eventType",e.summary,e.details,e.is_notification AS "isNotification",e.created_at AS "createdAt",u.email AS "actorEmail",r.read_at AS "readAt"
        FROM site_activity_events e LEFT JOIN users u ON u.id=e.actor_id LEFT JOIN admin_activity_reads r ON r.event_id=e.id AND r.admin_id=$1
        ORDER BY e.created_at DESC LIMIT $2 OFFSET $3`, [req.auth.sub, pageSize, (page - 1) * pageSize]),
      query("SELECT COUNT(*)::int AS total FROM site_activity_events"),
    ]);
    res.json({ events: events.rows, total: total.rows[0].total, page, pageSize });
  } catch (error) { next(error); }
});

app.get("/api/admin/notifications", requireAuth, requireCurrentTerms, requireAdmin, async (req, res, next) => {
  try {
    const [events, count] = await Promise.all([
      query(`SELECT e.id,e.event_type AS "eventType",e.summary,e.created_at AS "createdAt",e.listing_id AS "listingId"
        FROM site_activity_events e WHERE e.is_notification AND NOT EXISTS (SELECT 1 FROM admin_activity_reads r WHERE r.event_id=e.id AND r.admin_id=$1)
        ORDER BY e.created_at DESC LIMIT 100`, [req.auth.sub]),
      query("SELECT COUNT(*)::int AS total FROM site_activity_events e WHERE e.is_notification AND NOT EXISTS (SELECT 1 FROM admin_activity_reads r WHERE r.event_id=e.id AND r.admin_id=$1)", [req.auth.sub]),
    ]);
    res.json({ notifications: events.rows, unreadCount: count.rows[0].total });
  } catch (error) { next(error); }
});

app.post("/api/admin/notifications/read", requireAuth, requireCurrentTerms, requireAdmin, async (req, res, next) => {
  try {
    const { eventIds } = z.object({ eventIds: z.array(z.string().uuid()).max(100) }).parse(req.body);
    if (eventIds.length) await query(`INSERT INTO admin_activity_reads (event_id,admin_id) SELECT e.id,$1 FROM site_activity_events e WHERE e.id=ANY($2::uuid[]) AND e.is_notification ON CONFLICT DO NOTHING`, [req.auth.sub, eventIds]);
    res.status(204).end();
  } catch (error) { next(error); }
});

app.get("/api/admin/listings", requireAuth, requireCurrentTerms, requireAdmin, async (_req, res, next) => {
  try { const result = await query('SELECT l.id,l.title,l.description,l.make,l.model,l.year,l.location,l.price,l.type,l.status,l.images,l.image_url AS "imageUrl",l.created_at AS "createdAt",owner.email AS "ownerEmail",latest.reason AS "moderationReason",latest.created_at AS "moderatedAt" FROM listings l JOIN users owner ON owner.id=l.owner_id LEFT JOIN LATERAL (SELECT reason,created_at FROM listing_moderation_events WHERE listing_id=l.id ORDER BY created_at DESC LIMIT 1) latest ON true WHERE l.status IN ($1,$2,$3,$4) ORDER BY CASE l.status WHEN $1 THEN 0 WHEN $2 THEN 1 WHEN $3 THEN 2 ELSE 3 END,l.created_at ASC', ["pending","active","removed","rejected"]); res.json({ listings: result.rows }); } catch (error) { next(error); }
});

app.patch("/api/admin/listings/:id", requireAuth, requireCurrentTerms, requireAdmin, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const id = z.string().uuid().parse(req.params.id);
    const { status, reason = "" } = z.object({ status: z.enum(["active", "rejected", "removed"]), reason: z.string().trim().max(500).optional() }).parse(req.body);
    if ((status === "removed" || status === "rejected") && reason.trim().length < 12) return res.status(400).json({ error: "Add a clear moderation reason of at least 12 characters." });
    await client.query("BEGIN");
    const current = await client.query("SELECT id,status FROM listings WHERE id=$1 FOR UPDATE", [id]);
    if (!current.rows[0]) { await client.query("ROLLBACK"); return res.status(404).json({ error: "Listing not found." }); }
    if (["sold", "rented"].includes(current.rows[0].status)) { await client.query("ROLLBACK"); return res.status(409).json({ error: "Completed vehicle listings cannot be changed." }); }
    const updated = await client.query("UPDATE listings SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING id,status,title,type", [status,id]);
    await client.query("INSERT INTO listing_moderation_events (listing_id,admin_id,previous_status,new_status,reason) VALUES ($1,$2,$3,$4,$5)", [id,req.auth.sub,current.rows[0].status,status,reason.trim()]);
    await logSiteActivity({ eventType: "listing.moderated", actorId: req.auth.sub, listingId: id, summary: `An administrator changed ${updated.rows[0].title} to ${status}.`, details: { title: updated.rows[0].title, type: updated.rows[0].type, status, reason: reason.trim() } }, client);
    await client.query("COMMIT");
    res.json({ listing: updated.rows[0] });
  } catch (error) { try { await client.query("ROLLBACK"); } catch {} next(error); }
  finally { client.release(); }
});

const clientBuildPath = fileURLToPath(new URL("../../client/dist/", import.meta.url));
app.use(express.static(clientBuildPath));
app.use((error, _req, res, _next) => {
  if (error instanceof z.ZodError) return res.status(400).json({ error: "Some fields are invalid.", details: error.issues.map(({ path, message }) => ({ field: path.join("."), message })) });
  if (error.code === "23505") return res.status(409).json({ error: "That record already exists." });
  console.error("API request failed", error);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});
