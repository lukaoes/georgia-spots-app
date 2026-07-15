import { Router } from "express";
import crypto from "crypto";
import { v4 as uuid } from "uuid";
import { db } from "../db";
import { requireAuth, requireAdmin, AuthedRequest } from "../middleware/auth";
import { inferRegion } from "../regions";

const router = Router();
router.use(requireAuth, requireAdmin);

const BOOL_FIELDS = [
  "is_free", "service_water", "service_dump", "service_electricity", "service_shower",
  "service_toilet", "service_wifi", "service_shop", "open_all_year", "pets_allowed", "shade",
];
function rowToPlace(row: any) {
  const out: any = { ...row };
  for (const f of BOOL_FIELDS) out[f] = !!row[f];
  return out;
}

// GET /api/admin/places?status=pending
router.get("/places", (req, res) => {
  const status = (req.query.status as string) || "pending";
  const rows = db
    .prepare(
      `SELECT p.*, u.name as owner_name, u.email as owner_email,
       (SELECT url FROM photos ph WHERE ph.place_id = p.id ORDER BY ph.created_at ASC LIMIT 1) as cover_photo
       FROM places p JOIN users u ON u.id = p.owner_id
       WHERE p.status = ? ORDER BY p.created_at ASC`
    )
    .all(status);
  res.json({ places: rows.map(rowToPlace) });
});

router.post("/places/:id/approve", (req, res) => {
  const place = db.prepare("SELECT id, lat, lng, region FROM places WHERE id = ?").get(req.params.id) as any;
  if (!place) return res.status(404).json({ error: "ადგილი ვერ მოიძებნა" });
  // auto-assign a region label the first time a place is approved, so it becomes filterable
  const region = place.region || inferRegion(place.lat, place.lng);
  db.prepare(
    "UPDATE places SET status = 'approved', rejection_reason = NULL, flag_count = 0, region = ? WHERE id = ?"
  ).run(region, req.params.id);
  res.json({ ok: true, region });
});

router.post("/places/:id/reject", (req, res) => {
  const place = db.prepare("SELECT id FROM places WHERE id = ?").get(req.params.id);
  if (!place) return res.status(404).json({ error: "ადგილი ვერ მოიძებნა" });
  const { reason } = req.body || {};
  db.prepare("UPDATE places SET status = 'rejected', rejection_reason = ? WHERE id = ?").run(reason || null, req.params.id);
  res.json({ ok: true });
});

// deny a deletion request: put the place back to how it was (approved and public again)
router.post("/places/:id/restore", (req, res) => {
  const place = db.prepare("SELECT id FROM places WHERE id = ?").get(req.params.id);
  if (!place) return res.status(404).json({ error: "ადგილი ვერ მოიძებნა" });
  db.prepare("UPDATE places SET status = 'approved' WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

router.delete("/places/:id", (req, res) => {
  db.prepare("DELETE FROM places WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// GET /api/admin/reports
router.get("/reports", (req, res) => {
  const rows = db
    .prepare(
      `SELECT r.id, r.reason, r.created_at, p.id as place_id, p.name as place_name, p.status as place_status,
       u.name as reporter_name
       FROM reports r
       JOIN places p ON p.id = r.place_id
       JOIN users u ON u.id = r.user_id
       ORDER BY r.created_at DESC`
    )
    .all();
  res.json({ reports: rows });
});

router.delete("/reports/:id", (req, res) => {
  db.prepare("DELETE FROM reports WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// GET /api/admin/users?q=searchterm
router.get("/users", (req, res) => {
  const q = ((req.query.q as string) || "").trim().toLowerCase();
  let rows;
  if (q) {
    rows = db
      .prepare(
        `SELECT u.id, u.name, u.username, u.email, u.is_admin, u.created_at, u.avatar_url,
         (SELECT COUNT(*) FROM places p WHERE p.owner_id = u.id) as places_count,
         (SELECT COUNT(*) FROM reviews rv WHERE rv.user_id = u.id) as reviews_count
         FROM users u
         WHERE LOWER(u.name) LIKE ? OR LOWER(u.username) LIKE ? OR LOWER(u.email) LIKE ?
         ORDER BY u.created_at DESC`
      )
      .all(`%${q}%`, `%${q}%`, `%${q}%`);
  } else {
    rows = db
      .prepare(
        `SELECT u.id, u.name, u.username, u.email, u.is_admin, u.created_at, u.avatar_url,
         (SELECT COUNT(*) FROM places p WHERE p.owner_id = u.id) as places_count,
         (SELECT COUNT(*) FROM reviews rv WHERE rv.user_id = u.id) as reviews_count
         FROM users u ORDER BY u.created_at DESC`
      )
      .all();
  }
  res.json({ users: rows });
});

router.post("/users/:id/toggle-admin", (req: AuthedRequest, res) => {
  if (req.params.id === req.userId) {
    return res.status(400).json({ error: "საკუთარი ადმინ სტატუსის შეცვლა არ შეიძლება" });
  }
  const user = db.prepare("SELECT is_admin FROM users WHERE id = ?").get(req.params.id) as any;
  if (!user) return res.status(404).json({ error: "მომხმარებელი ვერ მოიძებნა" });
  db.prepare("UPDATE users SET is_admin = ? WHERE id = ?").run(user.is_admin ? 0 : 1, req.params.id);
  res.json({ ok: true });
});

// DELETE /api/admin/users/:id - remove a user and everything they own/authored
router.delete("/users/:id", (req: AuthedRequest, res) => {
  if (req.params.id === req.userId) {
    return res.status(400).json({ error: "საკუთარი თავის წაშლა არ შეიძლება" });
  }
  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "მომხმარებელი ვერ მოიძებნა" });

  const cascade = db.transaction((userId: string) => {
    // places they own cascade-delete their photos/reviews/reports/favorites/visits via FK ON DELETE CASCADE
    db.prepare("DELETE FROM places WHERE owner_id = ?").run(userId);
    // content they left on other people's places
    db.prepare("DELETE FROM reviews WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM reports WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM favorites WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM visits WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  });
  cascade(req.params.id);

  res.json({ ok: true });
});

// GET /api/admin/password-reset-requests
router.get("/password-reset-requests", (req, res) => {
  const rows = db
    .prepare("SELECT * FROM password_reset_requests WHERE status = 'open' ORDER BY created_at DESC")
    .all() as any[];
  // best-effort match to an existing account, so the admin doesn't have to search manually
  for (const r of rows) {
    const match = db
      .prepare("SELECT id, name, username, email FROM users WHERE email = ? OR username = ?")
      .get(r.email, r.username) as any;
    r.matched_user = match || null;
  }
  res.json({ requests: rows });
});

router.delete("/password-reset-requests/:id", (req, res) => {
  db.prepare("UPDATE password_reset_requests SET status = 'resolved' WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// POST /api/admin/users/:id/generate-reset-link
// Creates a time-limited token for a page where the person sets their OWN new password
// (prefilled with their username/email, read-only). The admin still has to send this link
// to the person themselves - nothing is emailed automatically.
router.post("/users/:id/generate-reset-link", (req, res) => {
  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "მომხმარებელი ვერ მოიძებნა" });
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  db.prepare(
    "INSERT INTO password_reset_tokens (id, user_id, token, expires_at) VALUES (?,?,?,?)"
  ).run(uuid(), req.params.id, token, expiresAt);
  res.json({ ok: true, token, expires_at: expiresAt });
});

export default router;
