// Vercel Routing Middleware — runs at the edge, in front of every request to
// /place/:id and /users/:username (see `config.matcher` below).
//
// WHY THIS EXISTS
// This app is a client-rendered Vite SPA. Per-page titles/OG tags are set by
// react-helmet-async (see src/components/SEO.tsx), but that only happens
// *after* the JS bundle runs. Anything that reads the raw HTML response
// without executing JavaScript — and that's most link-preview scrapers, not
// just a specific list of them — only ever sees index.html's static
// homepage tags. That's why every shared campsite link showed the generic
// "Vanlife.Ge" preview instead of that place's own name/photo/description.
//
// The previous fix (see vercel.json history) tried to solve this by
// pattern-matching known bot User-Agent strings (facebookexternalhit,
// Twitterbot, Slackbot, ...) and only rewriting *those* requests to a
// separate bot-only HTML endpoint. That approach can never cover "any
// platform" — it only works for the handful of crawlers whose UA string
// happens to be on the list, and plenty of apps (iMessage, Viber, KakaoTalk,
// many in-app browsers, etc.) unfurl links with a UA that looks just like a
// normal browser, so they'd never match the list no matter how long it gets.
//
// This middleware removes User-Agent sniffing entirely. It rewrites the
// *content* of index.html itself for anyone who requests these URLs — bot or
// human, any platform — so the correct tags are simply always there in the
// first byte of HTML. Real users still get the exact same index.html
// (scripts, root div, everything) and the SPA hydrates and runs completely
// normally afterwards; react-helmet-async then keeps things in sync for
// in-app navigation. Nothing about this depends on recognizing a particular
// scraper.

export const config = {
  matcher: ["/place/:id", "/users/:username"],
};

// Public, read-only API the frontend already calls from the browser (see
// src/api.ts: api.getPlace / api.publicProfile). This middleware only reads
// from it — no backend changes.
const API_ORIGIN = process.env.API_ORIGIN || "https://api.vanlife.ge";
const SITE_ORIGIN = process.env.SITE_ORIGIN || "https://vanlife.ge";

const SITE_NAME = "Vanlife.Ge";
const DEFAULT_DESCRIPTION =
  "იპოვეთ საუკეთესო ბანაკები, ღამის გასათევი ადგილები და სადგომები ავტოსახლებისა და კარვებისთვის საქართველოში.";

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function absolutizeUrl(url: string, base: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

interface Meta {
  title: string;
  description: string;
  image: string;
  url: string;
}

async function metaForPlace(id: string): Promise<Meta | null> {
  const res = await fetch(`${API_ORIGIN}/api/places/${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  const data = await res.json();
  const place = data?.place;
  if (!place) return null;

  const cover = Array.isArray(data.photos) && data.photos.length > 0 ? data.photos[0].url : null;
  const description = place.description
    ? truncate(place.description, 155)
    : `${place.category || ""}${place.region ? `, ${place.region}` : ""} — ${SITE_NAME}-ზე.`;

  return {
    title: place.name || SITE_NAME,
    description,
    image: cover ? absolutizeUrl(cover, SITE_ORIGIN) : `${SITE_ORIGIN}/og-default.png`,
    url: `${SITE_ORIGIN}/place/${place.id}`,
  };
}

async function metaForProfile(username: string): Promise<Meta | null> {
  const res = await fetch(`${API_ORIGIN}/api/users/${encodeURIComponent(username)}/public`);
  if (!res.ok) return null;
  const data = await res.json();
  const user = data?.user;
  if (!user) return null;

  const placeCount = Array.isArray(data.places) ? data.places.length : 0;
  const description = user.bio ? truncate(user.bio, 155) : `${user.name}-ის ${placeCount} დამატებული ადგილი ${SITE_NAME}-ზე.`;

  return {
    title: `${user.name} (@${user.username})`,
    description,
    image: user.avatar_url ? absolutizeUrl(user.avatar_url, SITE_ORIGIN) : `${SITE_ORIGIN}/og-default.png`,
    url: `${SITE_ORIGIN}/users/${user.username}`,
  };
}

// Replaces the content="" value of a single <meta property="..."> or
// <meta name="..."> tag. Falls back to leaving the tag untouched if it
// isn't found, so a template change elsewhere never breaks this middleware.
function setMetaContent(html: string, attrName: "property" | "name", attrValue: string, newValue: string): string {
  const re = new RegExp(`(<meta\\s+${attrName}=["']${attrValue}["']\\s+content=["'])[^"']*(["'])`, "i");
  return re.test(html) ? html.replace(re, (_m, pre, post) => `${pre}${escapeHtml(newValue)}${post}`) : html;
}

function injectMeta(html: string, meta: Meta): string {
  let out = html;
  out = out.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`);
  out = setMetaContent(out, "name", "description", meta.description);
  out = setMetaContent(out, "property", "og:title", meta.title);
  out = setMetaContent(out, "property", "og:description", meta.description);
  out = setMetaContent(out, "property", "og:image", meta.image);
  out = setMetaContent(out, "name", "twitter:title", meta.title);
  out = setMetaContent(out, "name", "twitter:description", meta.description);
  out = setMetaContent(out, "name", "twitter:image", meta.image);

  // The base template has no og:url/canonical (there's no single canonical
  // URL for the homepage's default tags), but a shared place/profile link
  // does have one, and several platforms (LinkedIn, Slack, WhatsApp) use it
  // to dedupe/validate the preview. Insert both right before </head>.
  const extraTags = `<meta property="og:url" content="${escapeHtml(meta.url)}">\n<link rel="canonical" href="${escapeHtml(meta.url)}">\n</head>`;
  out = out.replace(/<\/head>/i, extraTags);

  return out;
}

export default async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url);

  // Fetch the real, built index.html directly so we never drift from
  // whatever the actual SPA shell looks like after a deploy.
  const shellRes = await fetch(new URL("/index.html", url));
  const shell = await shellRes.text();

  try {
    const placeMatch = url.pathname.match(/^\/place\/([^/]+)\/?$/);
    const userMatch = url.pathname.match(/^\/users\/([^/]+)\/?$/);

    const meta = placeMatch
      ? await metaForPlace(decodeURIComponent(placeMatch[1]))
      : userMatch
        ? await metaForProfile(decodeURIComponent(userMatch[1]))
        : null;

    const html = meta ? injectMeta(shell, meta) : shell;

    return new Response(html, {
      status: shellRes.status,
      headers: {
        "content-type": "text/html; charset=utf-8",
        // Short edge cache: previews stay fresh soon after a place is edited,
        // while still saving a round-trip to the API on repeated unfurls.
        "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch {
    // Any failure (API down, unexpected shape, etc.) falls back to the
    // untouched shell rather than breaking the page for anyone.
    return new Response(shell, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
}