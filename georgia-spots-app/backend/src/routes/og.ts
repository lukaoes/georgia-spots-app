import { Router } from "express";
import { db } from "../db";

const router = Router();

// These two routes exist for exactly one audience: bots that don't run JavaScript (Facebook,
// Twitter/X, Slack, WhatsApp, Telegram link previews, and search crawlers as a fast fallback).
// A real browser never hits these - vercel.json only routes requests here when the User-Agent
// matches a known crawler; everyone else gets the normal React app. Without this, every share
// of a campsite link showed the generic homepage preview instead of that campsite's own photo
// and description, since react-helmet-async's per-page tags only apply after JS runs, which
// these bots never do.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function ogPage(opts: { title: string; description: string; image: string; url: string; siteName: string }) {
  const { title, description, image, url, siteName } = opts;
  return `<!doctype html>
<html>
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${url}">
<meta property="og:site_name" content="${escapeHtml(siteName)}">
<meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${image}">
</head>
<body></body>
</html>`;
}

function siteBase(req: any): string {
function siteBase(_req: any): string {
  const configured = process.env.FRONTEND_ORIGIN?.split(",")[0]?.trim();
  return configured || `${req.protocol}://${req.get("host")}`;
  // NOTE: this must never fall back to the *API's* own host (req.protocol/req.get("host")) -
  // these routes live on api.vanlife.ge, but og:url/canonical need to point at the frontend
  // (vanlife.ge). Falling back to the request's own host silently produced links like
  // "https://api.vanlife.ge/place/xxx" whenever FRONTEND_ORIGIN wasn't set, which is a broken
  // page. If FRONTEND_ORIGIN isn't configured, hardcode the known production frontend instead.
  return configured || "https://vanlife.ge";
}

// Photo/avatar URLs are absolute when stored in R2 (https://<bucket>.../file.webp) but relative
// when the app falls back to local disk storage (just "/uploads/file.webp" - see backend/src/
// routes/uploads.ts). A relative path in <meta property="og:image"> isn't valid - scrapers like
// Facebook's need a fully-qualified URL and will error out on the page instead of just skipping
// the image, so every relative image URL must be resolved against the site's base first.
function absolutizeUrl(url: string, base: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

router.get("/og/place/:id", (req, res) => {
  const base = siteBase(req);
  const place = db.prepare("SELECT * FROM places WHERE id = ?").get(req.params.id) as any;
  if (!place) {
    res.status(404).set("Content-Type", "text/html").send(
      ogPage({
        title: "Vanlife.Ge",
        description: "იპოვეთ საუკეთესო ბანაკები, ღამის გასათევი ადგილები და სადგომები ავტოსახლებისა და კარვებისთვის საქართველოში.",
        image: `${base}/og-default.png`,
        url: `${base}/place/${req.params.id}`,
        siteName: "Vanlife.Ge",
      })
    );
    return;
  }
  const cover = db.prepare("SELECT url FROM photos WHERE place_id = ? ORDER BY created_at ASC LIMIT 1").get(place.id) as any;
  const description = place.description
    ? place.description.slice(0, 155) + (place.description.length > 155 ? "…" : "")
    : `${place.category || ""}${place.region ? `, ${place.region}` : ""} — Vanlife.Ge-ზე.`;

  res.set("Content-Type", "text/html").send(
    ogPage({
      title: place.name,
      description,
      image: cover?.url || `${base}/og-default.png`,
      image: cover?.url ? absolutizeUrl(cover.url, base) : `${base}/og-default.png`,
      url: `${base}/place/${place.id}`,
      siteName: "Vanlife.Ge",
    })
  );
});

router.get("/og/profile/:username", (req, res) => {
  const base = siteBase(req);
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(req.params.username) as any;
  if (!user) {
    res.status(404).set("Content-Type", "text/html").send(
      ogPage({
        title: "Vanlife.Ge",
        description: "იპოვეთ საუკეთესო ბანაკები, ღამის გასათევი ადგილები და სადგომები ავტოსახლებისა და კარვებისთვის საქართველოში.",
        image: `${base}/og-default.png`,
        url: `${base}/users/${req.params.username}`,
        siteName: "Vanlife.Ge",
      })
    );
    return;
  }
  const placeCount = (db.prepare("SELECT COUNT(*) as c FROM places WHERE owner_id = ? AND status = 'approved'").get(user.id) as any).c;
  res.set("Content-Type", "text/html").send(
    ogPage({
      title: `${user.name} (@${user.username})`,
      description: user.bio ? user.bio.slice(0, 155) : `${user.name}-ის ${placeCount} დამატებული ადგილი Vanlife.Ge-ზე.`,
      image: user.avatar_url || `${base}/og-default.png`,
      image: user.avatar_url ? absolutizeUrl(user.avatar_url, base) : `${base}/og-default.png`,
      url: `${base}/users/${user.username}`,
      siteName: "Vanlife.Ge",
    })
  );
});

export default router;
