import Database from "better-sqlite3";
import path from "path";

// In production (e.g. on Northflank), set DB_PATH to a file inside your mounted persistent
// volume (e.g. /data/data.sqlite) so the database survives restarts/redeploys. Left unset,
// it defaults to a file next to the project - fine for local development.
const dbPath = process.env.DB_PATH || path.join(__dirname, "..", "data.sqlite");
export { dbPath };
export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  google_id TEXT UNIQUE,
  is_admin INTEGER NOT NULL DEFAULT 0,
  avatar_url TEXT,
  bio TEXT NOT NULL DEFAULT '',
  social_instagram TEXT,
  social_youtube TEXT,
  social_facebook TEXT,
  social_tiktok TEXT,
  favorites_public INTEGER NOT NULL DEFAULT 0,
  visits_public INTEGER NOT NULL DEFAULT 0,
  agreed_pledge INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS places (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  category TEXT NOT NULL,
  region TEXT,
  is_free INTEGER NOT NULL DEFAULT 1,
  price_amount REAL,
  service_water INTEGER NOT NULL DEFAULT 0,
  service_dump INTEGER NOT NULL DEFAULT 0,
  service_electricity INTEGER NOT NULL DEFAULT 0,
  service_shower INTEGER NOT NULL DEFAULT 0,
  service_toilet INTEGER NOT NULL DEFAULT 0,
  service_wifi INTEGER NOT NULL DEFAULT 0,
  service_shop INTEGER NOT NULL DEFAULT 0,
  vehicle_type TEXT NOT NULL DEFAULT 'any',
  max_length_m REAL,
  max_height_m REAL,
  road_difficulty TEXT NOT NULL DEFAULT 'easy',
  surface TEXT NOT NULL DEFAULT 'gravel',
  environment TEXT NOT NULL DEFAULT 'mountain',
  capacity_estimate INTEGER,
  open_all_year INTEGER NOT NULL DEFAULT 1,
  open_from TEXT,
  open_to TEXT,
  pets_allowed INTEGER NOT NULL DEFAULT 1,
  quietness TEXT NOT NULL DEFAULT 'quiet',
  shade INTEGER NOT NULL DEFAULT 0,
  ground_level TEXT NOT NULL DEFAULT 'flat',
  status TEXT NOT NULL DEFAULT 'pending',
  rejection_reason TEXT,
  flag_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  uploaded_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  visited_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS review_photos (
  id TEXT PRIMARY KEY,
  review_id TEXT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS favorites (
  user_id TEXT NOT NULL REFERENCES users(id),
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, place_id)
);

CREATE TABLE IF NOT EXISTS visits (
  user_id TEXT NOT NULL REFERENCES users(id),
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  visited_date TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, place_id)
);

CREATE TABLE IF NOT EXISTS password_reset_requests (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  username TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_places_lat_lng ON places(lat, lng);
CREATE INDEX IF NOT EXISTS idx_places_category ON places(category);
CREATE INDEX IF NOT EXISTS idx_places_status ON places(status);
CREATE INDEX IF NOT EXISTS idx_places_region ON places(region);
CREATE INDEX IF NOT EXISTS idx_reviews_place ON reviews(place_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_place ON photos(place_id);
CREATE INDEX IF NOT EXISTS idx_review_photos_review ON review_photos(review_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_reset_requests_status ON password_reset_requests(status);
CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON password_reset_tokens(token);
`);
