import { Router } from "express";
import rateLimit from "express-rate-limit";
import { v4 as uuid } from "uuid";
import { db } from "../db";
import { requireAuth, optionalAuth, AuthedRequest } from "../middleware/auth";

const router = Router();

// Per-account limit on place detail views. The IP-based limiter in index.ts still applies
// on top of this, but that alone doesn't stop a scraper running from a residential proxy or
// VPN, since a logged-in account looks the same from every IP. Keying on userId instead means
// the limit follows the account no matter where the requests come from. 200 detail views per
// 15 minutes is generous for a real person browsing but slow enough (a bit over one every 5
// seconds, sustained) to make scraping every listing tedious and rate-limited rather than fast.
const detailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: AuthedRequest) => req.userId || req.ip || "anon",
  message: { error: "ძალიან ბევრი მოთხოვნა, გთხოვთ სცადოთ მოგვიანებით." },
});

// Haversine distance in km, registered as a SQL function
db.function("distance_km", (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
});

const BOOL_FIELDS = [
  "is_free",
  "service_water",
  "service_dump",
  "service_electricity",
  "service_shower",
  "service_toilet",
  "service_wifi",
  "service_shop",
  "open_all_year",
  "pets_allowed",
  "shade",
];

function rowToPlace(row: any) {
  const out: any = { ...row };
  for (const f of BOOL_FIELDS) out[f] = !!row[f];
  return out;
}

// GET /api/places  - list with filters
router.get("/", (req, res) => {
  const {
    category,
    is_free,
    service_water,
    service_dump,
    service_electricity,
    service_shower,
    service_toilet,
    service_wifi,
    service_shop,
    vehicle_type,
    road_difficulty,
    surface,
    environment,
    open_all_year,
    pets_allowed,
    quietness,
    shade,
    ground_level,
    region,
    lat,
    lng,
    radius_km,
    bbox, // "minLat,minLng,maxLat,maxLng"
  } = req.query as Record<string, string>;

  const clauses: string[] = ["p.status = 'approved'"];
  const params: any[] = [];

  function addEq(field: string, value?: string) {
    if (value !== undefined && value !== "") {
      clauses.push(`${field} = ?`);
      params.push(value);
    }
  }
  function addBool(field: string, value?: string) {
    if (value !== undefined && value !== "") {
      clauses.push(`${field} = ?`);
      params.push(value === "true" || value === "1" ? 1 : 0);
    }
  }

  addEq("p.category", category);
  addBool("p.is_free", is_free);
  addBool("p.service_water", service_water);
  addBool("p.service_dump", service_dump);
  addBool("p.service_electricity", service_electricity);
  addBool("p.service_shower", service_shower);
  addBool("p.service_toilet", service_toilet);
  addBool("p.service_wifi", service_wifi);
  addBool("p.service_shop", service_shop);
  addEq("p.vehicle_type", vehicle_type);
  addEq("p.road_difficulty", road_difficulty);
  addEq("p.surface", surface);
  addEq("p.environment", environment);
  addBool("p.open_all_year", open_all_year);
  addBool("p.pets_allowed", pets_allowed);
  addEq("p.quietness", quietness);
  addBool("p.shade", shade);
  addEq("p.ground_level", ground_level);
  addEq("p.region", region);

  if (bbox) {
    const [minLat, minLng, maxLat, maxLng] = bbox.split(",").map(Number);
    if ([minLat, minLng, maxLat, maxLng].every((n) => !Number.isNaN(n))) {
      clauses.push("p.lat BETWEEN ? AND ? AND p.lng BETWEEN ? AND ?");
      params.push(minLat, maxLat, minLng, maxLng);
    }
  }

  let sql = `SELECT p.*, u.name as owner_name, u.username as owner_username, u.avatar_url as owner_avatar,
    (SELECT COUNT(*) FROM reviews r WHERE r.place_id = p.id) as review_count,
    (SELECT AVG(rating) FROM reviews r WHERE r.place_id = p.id) as avg_rating,
    (SELECT url FROM photos ph WHERE ph.place_id = p.id ORDER BY ph.created_at ASC LIMIT 1) as cover_photo
    FROM places p JOIN users u ON u.id = p.owner_id WHERE ${clauses.join(" AND ")}`;

  if (lat && lng) {
    const latN = Number(lat);
    const lngN = Number(lng);
    const radius = radius_km ? Number(radius_km) : 50;
    sql = `SELECT * FROM (${sql}) WHERE distance_km(lat, lng, ?, ?) <= ?`;
    params.push(latN, lngN, radius);
  }

  sql += " ORDER BY created_at DESC LIMIT 500";

  const rows = db.prepare(sql).all(...params);
  res.json({ places: rows.map(rowToPlace) });
});

// GET /api/places/:id
// GET /api/places/:id - full detail (description, all photos, all reviews).
// Requires login server-side, not just in the UI - otherwise "log in to view details"
// would only be a frontend suggestion, trivially bypassed by calling this URL directly.
router.get("/:id", requireAuth, detailLimiter, (req, res) => {
  const place = db.prepare("SELECT * FROM places WHERE id = ?").get(req.params.id) as any;
  if (!place) return res.status(404).json({ error: "ადგილი ვერ მოიძებნა" });
  const photos = db
    .prepare("SELECT id, url, created_at FROM photos WHERE place_id = ? ORDER BY created_at ASC")
    .all(req.params.id);
  const reviews = db
    .prepare(
      `SELECT reviews.id, reviews.rating, reviews.text, reviews.visited_date, reviews.created_at,
              users.name as author_name
       FROM reviews JOIN users ON users.id = reviews.user_id
       WHERE place_id = ? ORDER BY reviews.created_at DESC`
    )
    .all(req.params.id) as any[];
  const reviewPhotoStmt = db.prepare("SELECT id, url FROM review_photos WHERE review_id = ? ORDER BY created_at ASC");
  for (const r of reviews) {
    r.photos = reviewPhotoStmt.all(r.id);
  }
  const owner = db.prepare("SELECT id, name, username, avatar_url FROM users WHERE id = ?").get(place.owner_id) as any;
  res.json({
    place: { ...rowToPlace(place), owner_name: owner?.name, owner_username: owner?.username, owner_avatar: owner?.avatar_url },
    photos,
    reviews,
  });
});

// POST /api/places - create
router.post("/", requireAuth, (req: AuthedRequest, res) => {
  const b = req.body || {};
  if (!b.name || b.lat === undefined || b.lng === undefined || !b.category) {
    return res.status(400).json({ error: "სახელი, კოორდინატები და კატეგორია სავალდებულოა" });
  }
  const id = uuid();
  db.prepare(
    `INSERT INTO places (
      id, owner_id, name, description, lat, lng, category,
      is_free, price_amount,
      service_water, service_dump, service_electricity, service_shower, service_toilet, service_wifi, service_shop,
      vehicle_type, max_length_m, max_height_m, road_difficulty,
      surface, environment, capacity_estimate,
      open_all_year, open_from, open_to, pets_allowed, quietness, shade, ground_level
    ) VALUES (?,?,?,?,?,?,?, ?,?, ?,?,?,?,?,?,?, ?,?,?,?, ?,?,?, ?,?,?,?,?,?,?)`
  ).run(
    id,
    req.userId,
    b.name,
    b.description || "",
    Number(b.lat),
    Number(b.lng),
    b.category,
    b.is_free === false ? 0 : 1,
    b.price_amount ?? null,
    b.service_water ? 1 : 0,
    b.service_dump ? 1 : 0,
    b.service_electricity ? 1 : 0,
    b.service_shower ? 1 : 0,
    b.service_toilet ? 1 : 0,
    b.service_wifi ? 1 : 0,
    b.service_shop ? 1 : 0,
    b.vehicle_type || "any",
    b.max_length_m ?? null,
    b.max_height_m ?? null,
    b.road_difficulty || "easy",
    b.surface || "gravel",
    b.environment || "mountain",
    b.capacity_estimate ?? null,
    b.open_all_year === false ? 0 : 1,
    b.open_from ?? null,
    b.open_to ?? null,
    b.pets_allowed === false ? 0 : 1,
    b.quietness || "quiet",
    b.shade ? 1 : 0,
    b.ground_level || "flat"
  );

  if (Array.isArray(b.photo_urls)) {
    const stmt = db.prepare("INSERT INTO photos (id, place_id, url, uploaded_by) VALUES (?,?,?,?)");
    for (const url of b.photo_urls) {
      stmt.run(uuid(), id, url, req.userId);
    }
  }

  const place = db.prepare("SELECT * FROM places WHERE id = ?").get(id);
  res.status(201).json({ place: rowToPlace(place) });
});

// PUT /api/places/:id - edit. Owner edits require admin re-approval (place goes back to
// "pending" and disappears from the public map until reviewed). Admin edits apply immediately.
router.put("/:id", requireAuth, (req: AuthedRequest, res) => {
  const existing = db.prepare("SELECT * FROM places WHERE id = ?").get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: "ადგილი ვერ მოიძებნა" });

  const requester = db.prepare("SELECT is_admin FROM users WHERE id = ?").get(req.userId) as any;
  const isAdmin = !!requester?.is_admin;
  const isOwner = existing.owner_id === req.userId;
  if (!isOwner && !isAdmin) return res.status(403).json({ error: "მხოლოდ ავტორს ან ადმინისტრატორს შეუძლია რედაქტირება" });

  const b = req.body || {};
  const fields = [
    "name", "description", "lat", "lng", "category", "is_free", "price_amount",
    "service_water", "service_dump", "service_electricity", "service_shower", "service_toilet",
    "service_wifi", "service_shop", "vehicle_type", "max_length_m", "max_height_m",
    "road_difficulty", "surface", "environment", "capacity_estimate", "open_all_year",
    "open_from", "open_to", "pets_allowed", "quietness", "shade", "ground_level",
  ];
  const updates: string[] = [];
  const params: any[] = [];
  for (const f of fields) {
    if (b[f] !== undefined) {
      updates.push(`${f} = ?`);
      const boolFields = ["is_free","service_water","service_dump","service_electricity","service_shower","service_toilet","service_wifi","service_shop","open_all_year","pets_allowed","shade"];
      params.push(boolFields.includes(f) ? (b[f] ? 1 : 0) : b[f]);
    }
  }

  if (isAdmin) {
    // admins may also directly change status/region if they include it
    if (b.status !== undefined) {
      updates.push("status = ?");
      params.push(b.status);
    }
    if (b.region !== undefined) {
      updates.push("region = ?");
      params.push(b.region);
    }
  } else {
    // owner edit: send back to the review queue, regardless of previous status
    updates.push("status = 'pending'", "rejection_reason = NULL");
  }

  if (updates.length) {
    params.push(req.params.id);
    db.prepare(`UPDATE places SET ${updates.join(", ")} WHERE id = ?`).run(...params);
  }

  if (Array.isArray(b.photo_urls) && b.photo_urls.length) {
    const stmt = db.prepare("INSERT INTO photos (id, place_id, url, uploaded_by) VALUES (?,?,?,?)");
    for (const url of b.photo_urls) stmt.run(uuid(), req.params.id, url, req.userId);
  }

  const place = db.prepare("SELECT * FROM places WHERE id = ?").get(req.params.id);
  res.json({ place: rowToPlace(place) });
});

// DELETE /api/places/:id/photos/:photoId - remove a single photo (owner or admin)
router.delete("/:id/photos/:photoId", requireAuth, (req: AuthedRequest, res) => {
  const place = db.prepare("SELECT owner_id FROM places WHERE id = ?").get(req.params.id) as any;
  if (!place) return res.status(404).json({ error: "ადგილი ვერ მოიძებნა" });
  const requester = db.prepare("SELECT is_admin FROM users WHERE id = ?").get(req.userId) as any;
  const isAdmin = !!requester?.is_admin;
  if (place.owner_id !== req.userId && !isAdmin) {
    return res.status(403).json({ error: "მხოლოდ ავტორს ან ადმინისტრატორს შეუძლია წაშლა" });
  }
  db.prepare("DELETE FROM photos WHERE id = ? AND place_id = ?").run(req.params.photoId, req.params.id);
  res.json({ ok: true });
});

// DELETE /api/places/:id
// If an owner deletes a place that's currently live (approved), it doesn't vanish immediately —
// it's pulled from the public map and queued as a "deletion request" for an admin to confirm.
// A place that was never public (pending/rejected/already queued) can just be removed outright.
router.delete("/:id", requireAuth, (req: AuthedRequest, res) => {
  const existing = db.prepare("SELECT * FROM places WHERE id = ?").get(req.params.id) as any;
  if (!existing) return res.status(404).json({ error: "ადგილი ვერ მოიძებნა" });

  const requester = db.prepare("SELECT is_admin FROM users WHERE id = ?").get(req.userId) as any;
  const isAdmin = !!requester?.is_admin;
  const isOwner = existing.owner_id === req.userId;
  if (!isOwner && !isAdmin) return res.status(403).json({ error: "მხოლოდ ავტორს ან ადმინისტრატორს შეუძლია წაშლა" });

  if (isAdmin) {
    db.prepare("DELETE FROM places WHERE id = ?").run(req.params.id);
    return res.json({ ok: true, deleted: true });
  }

  if (existing.status === "approved") {
    db.prepare("UPDATE places SET status = 'pending_deletion' WHERE id = ?").run(req.params.id);
    return res.json({ ok: true, deleted: false, queued: true });
  }

  db.prepare("DELETE FROM places WHERE id = ?").run(req.params.id);
  res.json({ ok: true, deleted: true });
});

// POST /api/places/:id/reviews
router.post("/:id/reviews", requireAuth, (req: AuthedRequest, res) => {
  const place = db.prepare("SELECT id FROM places WHERE id = ?").get(req.params.id);
  if (!place) return res.status(404).json({ error: "ადგილი ვერ მოიძებნა" });
  const { rating, text, visited_date, photo_urls } = req.body || {};
  const r = Number(rating);
  if (!r || r < 1 || r > 5) return res.status(400).json({ error: "შეფასება უნდა იყოს 1-დან 5-მდე" });
  const id = uuid();
  db.prepare(
    "INSERT INTO reviews (id, place_id, user_id, rating, text, visited_date) VALUES (?,?,?,?,?,?)"
  ).run(id, req.params.id, req.userId, r, text || "", visited_date || null);

  if (Array.isArray(photo_urls)) {
    const stmt = db.prepare("INSERT INTO review_photos (id, review_id, url) VALUES (?,?,?)");
    for (const url of photo_urls.slice(0, 6)) stmt.run(uuid(), id, url);
  }

  // leaving a review also logs the visit, so it shows up in "places I've been"
  db.prepare(
    "INSERT INTO visits (user_id, place_id, visited_date) VALUES (?,?,?) ON CONFLICT(user_id, place_id) DO UPDATE SET visited_date = excluded.visited_date"
  ).run(req.userId, req.params.id, visited_date || null);

  res.status(201).json({ id });
});

// POST /api/places/:id/report
router.post("/:id/report", requireAuth, (req: AuthedRequest, res) => {
  const place = db.prepare("SELECT id, flag_count FROM places WHERE id = ?").get(req.params.id) as any;
  if (!place) return res.status(404).json({ error: "ადგილი ვერ მოიძებნა" });
  const { reason } = req.body || {};
  if (!reason) return res.status(400).json({ error: "მიზეზის მითითება სავალდებულოა" });
  db.prepare("INSERT INTO reports (id, place_id, user_id, reason) VALUES (?,?,?,?)").run(
    uuid(),
    req.params.id,
    req.userId,
    reason
  );
  const newCount = (place.flag_count || 0) + 1;
  if (newCount >= 3) {
    db.prepare("UPDATE places SET flag_count = ?, status = 'pending' WHERE id = ?").run(newCount, req.params.id);
  } else {
    db.prepare("UPDATE places SET flag_count = ? WHERE id = ?").run(newCount, req.params.id);
  }
  res.status(201).json({ ok: true });
});

export default router;
