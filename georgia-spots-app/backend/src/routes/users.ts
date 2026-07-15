import { Router } from "express";
import { db } from "../db";
import { requireAuth, optionalAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

const BOOL_FIELDS = [
  "is_free", "service_water", "service_dump", "service_electricity", "service_shower",
  "service_toilet", "service_wifi", "service_shop", "open_all_year", "pets_allowed", "shade",
];
function rowToPlace(row: any) {
  const out: any = { ...row };
  for (const f of BOOL_FIELDS) out[f] = !!row[f];
  return out;
}

// GET /api/users/me/places - places I've added, any status
router.get("/me/places", requireAuth, (req: AuthedRequest, res) => {
  const rows = db
    .prepare(
      `SELECT p.*, (SELECT url FROM photos ph WHERE ph.place_id = p.id ORDER BY ph.created_at ASC LIMIT 1) as cover_photo
       FROM places p WHERE owner_id = ? ORDER BY created_at DESC`
    )
    .all(req.userId);
  res.json({ places: rows.map(rowToPlace) });
});

// GET /api/users/me/favorites
router.get("/me/favorites", requireAuth, (req: AuthedRequest, res) => {
  const rows = db
    .prepare(
      `SELECT p.*, (SELECT url FROM photos ph WHERE ph.place_id = p.id ORDER BY ph.created_at ASC LIMIT 1) as cover_photo,
       f.created_at as favorited_at
       FROM favorites f JOIN places p ON p.id = f.place_id
       WHERE f.user_id = ? ORDER BY f.created_at DESC`
    )
    .all(req.userId);
  res.json({ places: rows.map(rowToPlace) });
});

router.post("/me/favorites/:placeId", requireAuth, (req: AuthedRequest, res) => {
  const place = db.prepare("SELECT id FROM places WHERE id = ?").get(req.params.placeId);
  if (!place) return res.status(404).json({ error: "ადგილი ვერ მოიძებნა" });
  db.prepare("INSERT OR IGNORE INTO favorites (user_id, place_id) VALUES (?, ?)").run(req.userId, req.params.placeId);
  res.status(201).json({ ok: true });
});

router.delete("/me/favorites/:placeId", requireAuth, (req: AuthedRequest, res) => {
  db.prepare("DELETE FROM favorites WHERE user_id = ? AND place_id = ?").run(req.userId, req.params.placeId);
  res.json({ ok: true });
});

// GET /api/users/me/visits - places I've marked as visited / reviewed
router.get("/me/visits", requireAuth, (req: AuthedRequest, res) => {
  const rows = db
    .prepare(
      `SELECT p.*, (SELECT url FROM photos ph WHERE ph.place_id = p.id ORDER BY ph.created_at ASC LIMIT 1) as cover_photo,
       v.visited_date, v.created_at as visited_logged_at
       FROM visits v JOIN places p ON p.id = v.place_id
       WHERE v.user_id = ? ORDER BY COALESCE(v.visited_date, v.created_at) DESC`
    )
    .all(req.userId);
  res.json({ places: rows.map(rowToPlace) });
});

router.post("/me/visits/:placeId", requireAuth, (req: AuthedRequest, res) => {
  const place = db.prepare("SELECT id FROM places WHERE id = ?").get(req.params.placeId);
  if (!place) return res.status(404).json({ error: "ადგილი ვერ მოიძებნა" });
  const { visited_date } = req.body || {};
  db.prepare(
    `INSERT INTO visits (user_id, place_id, visited_date) VALUES (?, ?, ?)
     ON CONFLICT(user_id, place_id) DO UPDATE SET visited_date = excluded.visited_date`
  ).run(req.userId, req.params.placeId, visited_date || null);
  res.status(201).json({ ok: true });
});

router.delete("/me/visits/:placeId", requireAuth, (req: AuthedRequest, res) => {
  db.prepare("DELETE FROM visits WHERE user_id = ? AND place_id = ?").run(req.userId, req.params.placeId);
  res.json({ ok: true });
});

// GET /api/users/me/status/:placeId - quick lookup for favorite/visited state on a place page
router.get("/me/status/:placeId", requireAuth, (req: AuthedRequest, res) => {
  const fav = db.prepare("SELECT 1 FROM favorites WHERE user_id = ? AND place_id = ?").get(req.userId, req.params.placeId);
  const visit = db.prepare("SELECT visited_date FROM visits WHERE user_id = ? AND place_id = ?").get(req.userId, req.params.placeId) as any;
  res.json({ is_favorite: !!fav, is_visited: !!visit, visited_date: visit?.visited_date || null });
});

// PUT /api/users/me - update own profile: name, username, email, avatar, bio, socials, privacy toggles
const USERNAME_RE = /^[a-z0-9_]{3,24}$/;
router.put("/me", requireAuth, (req: AuthedRequest, res) => {
  const b = req.body || {};

  if (b.username !== undefined) {
    const uname = String(b.username).toLowerCase().trim();
    if (!USERNAME_RE.test(uname)) {
      return res
        .status(400)
        .json({ error: "მომხმარებლის სახელი უნდა იყოს 3-24 სიმბოლო: მხოლოდ ლათინური ასოები, ციფრები და ქვედა ტირე" });
    }
    const existing = db.prepare("SELECT id FROM users WHERE username = ? AND id != ?").get(uname, req.userId);
    if (existing) return res.status(409).json({ error: "ეს მომხმარებლის სახელი უკვე დაკავებულია" });
    b.username = uname;
  }
  if (b.email !== undefined) {
    const email = String(b.email).toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "ელ-ფოსტის ფორმატი არასწორია" });
    }
    const existing = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(email, req.userId);
    if (existing) return res.status(409).json({ error: "ეს ელ-ფოსტა უკვე გამოყენებულია" });
    b.email = email;
  }
  if (b.name !== undefined && !String(b.name).trim()) {
    return res.status(400).json({ error: "სახელი არ შეიძლება იყოს ცარიელი" });
  }

  const fields = [
    "name", "username", "email", "avatar_url", "bio",
    "social_instagram", "social_youtube", "social_facebook", "social_tiktok",
  ];
  const updates: string[] = [];
  const params: any[] = [];
  for (const f of fields) {
    if (b[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(b[f]);
    }
  }
  if (b.favorites_public !== undefined) {
    updates.push("favorites_public = ?");
    params.push(b.favorites_public ? 1 : 0);
  }
  if (b.visits_public !== undefined) {
    updates.push("visits_public = ?");
    params.push(b.visits_public ? 1 : 0);
  }
  if (updates.length) {
    params.push(req.userId);
    db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...params);
  }
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.userId) as any;
  res.json({
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      is_admin: !!user.is_admin,
      avatar_url: user.avatar_url || null,
      bio: user.bio || "",
      social_instagram: user.social_instagram || "",
      social_youtube: user.social_youtube || "",
      social_facebook: user.social_facebook || "",
      social_tiktok: user.social_tiktok || "",
      favorites_public: !!user.favorites_public,
      visits_public: !!user.visits_public,
    },
  });
});

// GET /api/users/:username/public - anyone's public profile page, looked up by username
router.get("/:username/public", optionalAuth, (req: AuthedRequest, res) => {
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(req.params.username) as any;
  if (!user) return res.status(404).json({ error: "მომხმარებელი ვერ მოიძებნა" });

  const isSelf = req.userId === user.id;

  const places = db
    .prepare(
      isSelf
        ? `SELECT p.*, (SELECT url FROM photos ph WHERE ph.place_id = p.id ORDER BY ph.created_at ASC LIMIT 1) as cover_photo
           FROM places p WHERE owner_id = ? ORDER BY created_at DESC`
        : `SELECT p.*, (SELECT url FROM photos ph WHERE ph.place_id = p.id ORDER BY ph.created_at ASC LIMIT 1) as cover_photo
           FROM places p WHERE owner_id = ? AND status = 'approved' ORDER BY created_at DESC`
    )
    .all(user.id)
    .map(rowToPlace);

  const reviews = db
    .prepare(
      `SELECT reviews.id, reviews.rating, reviews.text, reviews.visited_date, reviews.created_at,
              places.id as place_id, places.name as place_name
       FROM reviews JOIN places ON places.id = reviews.place_id
       WHERE reviews.user_id = ? ORDER BY reviews.created_at DESC LIMIT 100`
    )
    .all(user.id);

  let favorites: any[] = [];
  if (isSelf || user.favorites_public) {
    favorites = db
      .prepare(
        `SELECT p.*, (SELECT url FROM photos ph WHERE ph.place_id = p.id ORDER BY ph.created_at ASC LIMIT 1) as cover_photo
         FROM favorites f JOIN places p ON p.id = f.place_id
         WHERE f.user_id = ? AND p.status = 'approved' ORDER BY f.created_at DESC`
      )
      .all(user.id)
      .map(rowToPlace);
  }

  let visits: any[] = [];
  if (isSelf || user.visits_public) {
    visits = db
      .prepare(
        `SELECT p.*, (SELECT url FROM photos ph WHERE ph.place_id = p.id ORDER BY ph.created_at ASC LIMIT 1) as cover_photo,
         v.visited_date
         FROM visits v JOIN places p ON p.id = v.place_id
         WHERE v.user_id = ? AND p.status = 'approved' ORDER BY COALESCE(v.visited_date, v.created_at) DESC`
      )
      .all(user.id)
      .map(rowToPlace);
  }

  res.json({
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      avatar_url: user.avatar_url || null,
      bio: user.bio || "",
      social_instagram: user.social_instagram || "",
      social_youtube: user.social_youtube || "",
      social_facebook: user.social_facebook || "",
      social_tiktok: user.social_tiktok || "",
      created_at: user.created_at,
      favorites_public: !!user.favorites_public,
      visits_public: !!user.visits_public,
    },
    places,
    reviews,
    favorites,
    visits,
    is_self: isSelf,
  });
});

export default router;
