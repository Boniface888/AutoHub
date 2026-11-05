import jwt from "jsonwebtoken";

const cookieName = "autohub_session";
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  path: "/api",
};

export function issueSession(response, user) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters.");
  const token = jwt.sign({ sub: user.id, role: user.role }, secret, { expiresIn: "2h", issuer: "autohub-api", audience: "autohub-web" });
  response.cookie(cookieName, token, { ...cookieOptions, maxAge: 2 * 60 * 60 * 1000 });
}

export function clearSession(response) {
  response.clearCookie(cookieName, cookieOptions);
}

export function requireAuth(req, res, next) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) return res.status(503).json({ error: "Authentication is not configured." });
  const token = req.cookies?.[cookieName];
  if (!token) return res.status(401).json({ error: "Sign in to continue." });
  try {
    req.auth = jwt.verify(token, secret, { issuer: "autohub-api", audience: "autohub-web" });
    return next();
  } catch {
    return res.status(401).json({ error: "Your session has expired. Sign in again." });
  }
}

export function requireAdmin(req, res, next) {
  if (req.auth?.role !== "admin") return res.status(403).json({ error: "Administrator access is required." });
  return next();
}
