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
import { bookingSchema, credentialsSchema, emailSchema, listingSchema, resetPasswordSchema } from "./validation.js";
import { clearSession, issueSession, requireAdmin, requireAuth } from "./security.js";

export const app = express();
const isProduction = process.env.NODE_ENV === "production";
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
const allowedOrigins = new Set([frontendOrigin, "http://localhost:5173", "http://127.0.0.1:5173"]);
const originAllowed = (origin, req) => isProduction ? origin === `${req.protocol}://${req.get("host")}` : Boolean(origin && allowedOrigins.has(origin));
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false, message: { error: "Too many attempts. Try again shortly." } });
const apiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false });
const imageSignatureLimiter = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false });

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

app.post("/api/auth/register", authLimiter, async (req, res, next) => {
  try {
    const { email, password } = credentialsSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await query("INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, role", [email, passwordHash]);
    issueSession(res, result.rows[0]);
    res.status(201).json({ user: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ error: "An account with that email already exists." });
    next(error);
  }
});

app.post("/api/auth/login", authLimiter, async (req, res, next) => {
  try {
    const { email, password } = credentialsSchema.parse(req.body);
    const result = await query("SELECT id, email, role, password_hash FROM users WHERE email = $1", [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: "Email or password is incorrect." });
    issueSession(res, user);
    res.json({ user: { id: user.id, email: user.email, role: user.role } });
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
app.get("/api/auth/me", requireAuth, async (req, res, next) => {
  try {
    const result = await query("SELECT id, email, role, created_at FROM users WHERE id = $1", [req.auth.sub]);
    if (!result.rows[0]) return res.status(401).json({ error: "Account no longer exists." });
    res.json({ user: result.rows[0] });
  } catch (error) { next(error); }
});

app.post("/api/media/signature", requireAuth, imageSignatureLimiter, (req, res) => {
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
app.get("/api/listings", async (req, res, next) => {
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

app.post("/api/listings", requireAuth, async (req, res, next) => {
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
    const result = await query("INSERT INTO listings (owner_id,title,description,make,model,year,location,transmission,fuel,body,price,type,image_url,images,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,'active') RETURNING *", [req.auth.sub, listing.title, listing.description, listing.make, listing.model, listing.year, listing.location, listing.transmission, listing.fuel, listing.body, listing.price, listing.type, imageUrl, JSON.stringify(listingImages)]);
    res.status(201).json({ listing: result.rows[0] });
  } catch (error) { next(error); }
});

app.post("/api/bookings", requireAuth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const booking = bookingSchema.parse(req.body);
    const start = new Date(booking.startsAt);
    const end = new Date(booking.endsAt);
    if (start <= new Date() || end <= start) return res.status(400).json({ error: "Choose a future end date after the start date." });
    await client.query("BEGIN");
    const listing = await client.query("SELECT id,owner_id FROM listings WHERE id=$1 AND type='rent' AND status='active' FOR UPDATE", [booking.listingId]);
    if (!listing.rows[0] || listing.rows[0].owner_id === req.auth.sub) { await client.query("ROLLBACK"); return res.status(404).json({ error: "Rental listing was not found." }); }
    const conflict = await client.query("SELECT 1 FROM bookings WHERE listing_id=$1 AND status IN ('requested','confirmed') AND starts_at < $3 AND ends_at > $2", [booking.listingId, start, end]);
    if (conflict.rowCount) { await client.query("ROLLBACK"); return res.status(409).json({ error: "Those dates are not available." }); }
    const created = await client.query("INSERT INTO bookings (listing_id,renter_id,starts_at,ends_at) VALUES ($1,$2,$3,$4) RETURNING id,listing_id,starts_at,ends_at,status", [booking.listingId, req.auth.sub, start, end]);
    await client.query("COMMIT");
    res.status(201).json({ booking: created.rows[0] });
  } catch (error) { await client.query("ROLLBACK"); next(error); } finally { client.release(); }
});

app.get("/api/admin/listings", requireAuth, requireAdmin, async (_req, res, next) => {
  try { const result = await query("SELECT * FROM listings WHERE status='pending' ORDER BY created_at ASC"); res.json({ listings: result.rows }); } catch (error) { next(error); }
});

app.patch("/api/admin/listings/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { status } = z.object({ status: z.enum(["active", "rejected", "removed"]) }).parse(req.body);
    const result = await query("UPDATE listings SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING id,status", [status, req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: "Listing not found." });
    res.json({ listing: result.rows[0] });
  } catch (error) { next(error); }
});

const clientBuildPath = fileURLToPath(new URL("../../client/dist/", import.meta.url));
app.use(express.static(clientBuildPath));
app.use((error, _req, res, _next) => {
  if (error instanceof z.ZodError) return res.status(400).json({ error: "Some fields are invalid.", details: error.issues.map(({ path, message }) => ({ field: path.join("."), message })) });
  if (error.code === "23505") return res.status(409).json({ error: "That record already exists." });
  console.error("API request failed", error);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});
