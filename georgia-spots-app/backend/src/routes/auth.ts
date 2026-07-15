import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { OAuth2Client } from "google-auth-library";
import { db } from "../db";
import { JWT_SECRET, requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

const USERNAME_RE = /^[a-z0-9_]{3,24}$/;

function publicUser(u: any) {
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    email: u.email,
    is_admin: !!u.is_admin,
    avatar_url: u.avatar_url || null,
    bio: u.bio || "",
    social_instagram: u.social_instagram || "",
    social_youtube: u.social_youtube || "",
    social_facebook: u.social_facebook || "",
    social_tiktok: u.social_tiktok || "",
    favorites_public: !!u.favorites_public,
    visits_public: !!u.visits_public,
  };
}

function slugifyUsername(base: string): string {
  let slug = base
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);
  if (slug.length < 3) slug = "user" + slug;
  let candidate = slug;
  let i = 0;
  while (db.prepare("SELECT 1 FROM users WHERE username = ?").get(candidate)) {
    i += 1;
    candidate = `${slug}${i}`;
  }
  return candidate;
}

router.post("/register", async (req, res) => {
  const { name, username, email, password, agreed_pledge } = req.body || {};
  if (!name || !username || !email || !password) {
    return res.status(400).json({ error: "სახელი, მომხმარებლის სახელი, ელ-ფოსტა და პაროლი სავალდებულოა" });
  }
  if (!agreed_pledge) {
    return res.status(400).json({ error: "გასაგრძელებლად საჭიროა თანხმობა ბუნების დაცვის პირობაზე" });
  }
  const uname = String(username).toLowerCase().trim();
  if (!USERNAME_RE.test(uname)) {
    return res
      .status(400)
      .json({ error: "მომხმარებლის სახელი უნდა იყოს 3-24 სიმბოლო: მხოლოდ ლათინური ასოები, ციფრები და ქვედა ტირე" });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: "პაროლი უნდა შეიცავდეს მინიმუმ 6 სიმბოლოს" });
  }
  const existingEmail = db.prepare("SELECT id FROM users WHERE email = ?").get(String(email).toLowerCase());
  if (existingEmail) {
    return res.status(409).json({ error: "ეს ელ-ფოსტა უკვე რეგისტრირებულია" });
  }
  const existingUsername = db.prepare("SELECT id FROM users WHERE username = ?").get(uname);
  if (existingUsername) {
    return res.status(409).json({ error: "ეს მომხმარებლის სახელი უკვე დაკავებულია" });
  }
  const id = uuid();
  const hash = await bcrypt.hash(password, 10);
  db.prepare(
    "INSERT INTO users (id, name, username, email, password_hash, agreed_pledge) VALUES (?, ?, ?, ?, ?, 1)"
  ).run(id, name, uname, String(email).toLowerCase(), hash);
  const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: "30d" });
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
  res.status(201).json({ token, user: publicUser(user) });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "ელ-ფოსტა და პაროლი სავალდებულოა" });
  }
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(String(email).toLowerCase()) as any;
  if (!user || !user.password_hash) {
    return res.status(401).json({ error: "ელ-ფოსტა ან პაროლი არასწორია" });
  }
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: "ელ-ფოსტა ან პაროლი არასწორია" });
  }
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });
  res.json({ token, user: publicUser(user) });
});

// Sign in with Google: frontend sends the ID token credential from Google Identity Services.
// The frontend only calls this after the person has checked the leave-no-trace pledge box,
// and passes that along as agreed_pledge (only meaningful the first time an account is created).
router.post("/google", async (req, res) => {
  if (!googleClient) {
    return res.status(501).json({ error: "Google-ით შესვლა არ არის კონფიგურირებული სერვერზე" });
  }
  const { credential, agreed_pledge } = req.body || {};
  if (!credential) return res.status(400).json({ error: "credential სავალდებულოა" });

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: "Google-ის ტოკენის დამოწმება ვერ მოხერხდა" });
  }
  if (!payload?.email) return res.status(401).json({ error: "Google-ისგან ელ-ფოსტა ვერ მივიღეთ" });

  let user = db.prepare("SELECT * FROM users WHERE google_id = ?").get(payload.sub) as any;
  if (!user) {
    user = db.prepare("SELECT * FROM users WHERE email = ?").get(payload.email.toLowerCase()) as any;
    if (user) {
      db.prepare("UPDATE users SET google_id = ? WHERE id = ?").run(payload.sub, user.id);
    } else {
      if (!agreed_pledge) {
        return res.status(400).json({ error: "გასაგრძელებლად საჭიროა თანხმობა ბუნების დაცვის პირობაზე" });
      }
      const id = uuid();
      const uname = slugifyUsername((payload.email.split("@")[0] || "user"));
      db.prepare(
        "INSERT INTO users (id, name, username, email, google_id, agreed_pledge) VALUES (?, ?, ?, ?, ?, 1)"
      ).run(id, payload.name || uname, uname, payload.email.toLowerCase(), payload.sub);
      user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    }
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });
  res.json({ token, user: publicUser(user) });
});

router.get("/me", requireAuth, (req: AuthedRequest, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId);
  if (!user) return res.status(404).json({ error: "მომხმარებელი ვერ მოიძებნა" });
  res.json({ user: publicUser(user) });
});

// POST /api/auth/request-password-reset
// No email sending here - this just queues the request so an admin can see it in the admin
// panel and manually issue + send a new password to the person (see admin routes).
router.post("/request-password-reset", (req, res) => {
  const { email, username, message } = req.body || {};
  if (!email || !username) {
    return res.status(400).json({ error: "ელ-ფოსტა და მომხმარებლის სახელი სავალდებულოა" });
  }
  db.prepare("INSERT INTO password_reset_requests (id, email, username, message) VALUES (?,?,?,?)").run(
    uuid(),
    String(email).toLowerCase().trim(),
    String(username).toLowerCase().trim(),
    message ? String(message).slice(0, 500) : null
  );
  res.status(201).json({ ok: true });
});

// GET /api/auth/reset-password/:token - lets the reset page prefill username/email (read-only)
router.get("/reset-password/:token", (req, res) => {
  const row = db
    .prepare("SELECT * FROM password_reset_tokens WHERE token = ?")
    .get(req.params.token) as any;
  if (!row) return res.status(404).json({ error: "ბმული არასწორია ან ვადაგასულია" });
  if (row.used) return res.status(410).json({ error: "ეს ბმული უკვე გამოყენებულია" });
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return res.status(410).json({ error: "ეს ბმული ვადაგასულია, სთხოვეთ ადმინისტრატორს ახლის გენერაცია" });
  }
  const user = db.prepare("SELECT username, email FROM users WHERE id = ?").get(row.user_id) as any;
  if (!user) return res.status(404).json({ error: "მომხმარებელი ვერ მოიძებნა" });
  res.json({ username: user.username, email: user.email });
});

// POST /api/auth/reset-password/:token - person sets their own new password
router.post("/reset-password/:token", async (req, res) => {
  const row = db
    .prepare("SELECT * FROM password_reset_tokens WHERE token = ?")
    .get(req.params.token) as any;
  if (!row) return res.status(404).json({ error: "ბმული არასწორია ან ვადაგასულია" });
  if (row.used) return res.status(410).json({ error: "ეს ბმული უკვე გამოყენებულია" });
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return res.status(410).json({ error: "ეს ბმული ვადაგასულია, სთხოვეთ ადმინისტრატორს ახლის გენერაცია" });
  }
  const { password } = req.body || {};
  if (!password || String(password).length < 6) {
    return res.status(400).json({ error: "პაროლი უნდა შეიცავდეს მინიმუმ 6 სიმბოლოს" });
  }
  const hash = await bcrypt.hash(password, 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, row.user_id);
  db.prepare("UPDATE password_reset_tokens SET used = 1 WHERE id = ?").run(row.id);
  res.json({ ok: true });
});

export default router;
