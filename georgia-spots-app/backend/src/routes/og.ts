import { Router } from "express";
import { db } from "../db";

const router = Router();

// These routes serve EVERY request to /place/:id and /users/:username - not just requests from
// known bots. Previously vercel.json only forwarded here when the User-Agent matched a hardcoded
// list of crawlers (Facebook, Twitter, Slack, etc), and everyone/everything else fell through to
// the plain SPA shell with the homepage's generic title/description/og-default.png. That list can
// never be complete - plenty of apps that unfurl links (many chat apps, regional platforms, etc)
// don't announce themselves the way the list assumed, so shares through them silently showed the
// homepage preview instead of the place's own photo and description.
//
// The fix: stop branching on who's asking. Fetch the *real* frontend index.html (same JS/CSS
// bundle, same <div id="root">, same everything) and just swap in page-specific title/description/
// og/twitter tags before sending it back. Bots that don't run JS see the correct preview tags in
// the raw HTML. Real browsers get the exact same HTML, then the React app boots normally out of
// the <div id="root"> like it always did. One response body works for every platform because it's
// no longer trying to guess which platform is asking.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function siteBase(_req: any): string {
  const configured = process.env.FRONTEND_ORIGIN?.split(",")[0]?.trim();
  // NOTE: this must never fall back to the *API's* own host (req.protocol/req.get("host")) -
  // these routes live on api.vanlife.ge, but og:url/canonical (and the index.html fetch below)
  // need to point at the frontend (vanlife.ge). Falling back to the request's own host silently
  // produced links like "https://api.vanlife.ge/place/xxx" whenever FRONTEND_ORIGIN wasn't set,
  // which is a broken page. If FRONTEND_ORIGIN isn't configured, hardcode the known production
  // frontend instead.
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

// Caches the frontend's built index.html in memory so a burst of place views doesn't refetch it
// on every single request - it only changes on a new frontend deploy. A few minutes of staleness
// just means the JS/CSS bundle tags briefly lag the newest deploy, which Vercel tolerates fine
// since it keeps recent deploys' assets around.
let shellCache: { html: string; fetchedAt: number } | null = null;
const SHELL_TTL_MS = 5 * 60 * 1000;

async function getFrontendShell(base: string): Promise<string | null> {
  if (shellCache && Date.now() - shellCache.fetchedAt < SHELL_TTL_MS) {
    return shellCache.html;
  }
  try {
    const res = await fetch(`${base}/index.html`);
    if (!res.ok) return shellCache?.html ?? null;
    const html = await res.text();
    shellCache = { html, fetchedAt: Date.now() };
    return html;
  } catch {
    return shellCache?.html ?? null;
  }
}

type MetaOpts = { title: string; description: string; image: string; url: string; siteName: string };

function metaBlock(opts: MetaOpts): string {
  const { title, description, image, url, siteName } = opts;
  return `<title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:site_name" content="${escapeHtml(siteName)}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:locale" content="ka_GE" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${image}" />`;
}

// Swaps the homepage's hardcoded title/description/OG/Twitter tags (frontend/index.html) for
// page-specific ones, leaving the rest of the shell - the JS/CSS bundle tags, <div id="root">,
// everything - untouched so the real app still boots normally.
function injectMeta(shellHtml: string, opts: MetaOpts): string {
  const block = metaBlock(opts);
  // Matches from <title> up through (but not including) the ld+json script tag - exactly the
  // block of tags frontend/index.html hardcodes for the homepage.
  const withReplacement = shellHtml.replace(
    /<title>[\s\S]*?<\/title>[\s\S]*?(?=<script type="application\/ld\+json">)/,
    `${block}\n    `
  );
  if (withReplacement !== shellHtml) return withReplacement;
  // If the shell's shape ever changes and that regex stops matching, fall back to appending the
  // override tags right before </head> - browsers and scrapers use the last matching meta tag
  // of a given name/property, so ours still wins even if the originals are left in place too.
  return shellHtml.replace("</head>", `${block}\n  </head>`);
}

// Used only if fetching the live frontend shell fails outright (e.g. frontend is down) - a bare
// but still-correct preview page beats a hard error.
function fallbackPage(opts: MetaOpts): string {
  return `<!doctype html>
<html>
<head>
<meta charset="UTF-8">
${metaBlock(opts)}
</head>
<body></body>
</html>`;
}

router.get("/og/place/:id", async (req, res) => {
  const base = siteBase(req);
  const place = db.prepare("SELECT * FROM places WHERE id = ?").get(req.params.id) as any;

  let opts: MetaOpts;
  if (!place) {
    opts = {
      title: "Vanlife.Ge",
      description: "იპოვეთ საუკეთესო ბანაკები, ღამის გასათევი ადგილები და სადგომები ავტოსახლებისა და კარვებისთვის საქართველოში.",
      image: `${base}/og-default.png`,
      url: `${base}/place/${req.params.id}`,
      siteName: "Vanlife.Ge",
    };
  } else {
    const cover = db.prepare("SELECT url FROM photos WHERE place_id = ? ORDER BY created_at ASC LIMIT 1").get(place.id) as any;
    const description = place.description
      ? place.description.slice(0, 155) + (place.description.length > 155 ? "…" : "")
      : `${place.category || ""}${place.region ? `, ${place.region}` : ""} — Vanlife.Ge-ზე.`;
    opts = {
      title: place.name,
      description,
      image: cover?.url ? absolutizeUrl(cover.url, base) : `${base}/og-default.png`,
      url: `${base}/place/${place.id}`,
      siteName: "Vanlife.Ge",
    };
  }

  const shell = await getFrontendShell(base);
  const html = shell ? injectMeta(shell, opts) : fallbackPage(opts);
  res.status(place ? 200 : 404).set("Content-Type", "text/html").send(html);
});

router.get("/og/profile/:username", async (req, res) => {
  const base = siteBase(req);
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(req.params.username) as any;

  let opts: MetaOpts;
  if (!user) {
    opts = {
      title: "Vanlife.Ge",
      description: "იპოვეთ საუკეთესო ბანაკები, ღამის გასათევი ადგილები და სადგომები ავტოსახლებისა და კარვებისთვის საქართველოში.",
      image: `${base}/og-default.png`,
      url: `${base}/users/${req.params.username}`,
      siteName: "Vanlife.Ge",
    };
  } else {
    const placeCount = (db.prepare("SELECT COUNT(*) as c FROM places WHERE owner_id = ? AND status = 'approved'").get(user.id) as any).c;
    opts = {
      title: `${user.name} (@${user.username})`,
      description: user.bio ? user.bio.slice(0, 155) : `${user.name}-ის ${placeCount} დამატებული ადგილი Vanlife.Ge-ზე.`,
      image: user.avatar_url ? absolutizeUrl(user.avatar_url, base) : `${base}/og-default.png`,
      url: `${base}/users/${user.username}`,
      siteName: "Vanlife.Ge",
    };
  }

  const shell = await getFrontendShell(base);
  const html = shell ? injectMeta(shell, opts) : fallbackPage(opts);
  res.status(user ? 200 : 404).set("Content-Type", "text/html").send(html);
});

export default router;
