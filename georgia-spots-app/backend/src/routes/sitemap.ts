import { Router } from "express";
import { db } from "../db";

const router = Router();

// GET /api/sitemap.xml - exposed at the site root via a vercel.json rewrite (/sitemap.xml ->
// this route), same pattern as /api/places being proxied for the frontend. Generated fresh on
// every request from the live database rather than as a static file, since the whole point is
// that new/removed listings show up here automatically - a static sitemap would silently go
// stale the moment someone adds or deletes a place.
router.get("/sitemap.xml", (req, res) => {
  const places = db
    .prepare("SELECT id, created_at FROM places WHERE status = 'approved'")
    .all() as { id: string; created_at: string }[];

  // Best-effort base URL: prefer the first configured frontend origin (what the site is
  // actually meant to be reached at), falling back to the request's own origin if that's unset.
  const configuredOrigin = process.env.FRONTEND_ORIGIN?.split(",")[0]?.trim();
  const baseUrl = configuredOrigin || `${req.protocol}://${req.get("host")}`;

  const staticUrls = [{ loc: "/", priority: "1.0" }];
  const urls = [
    ...staticUrls.map((u) => `  <url>\n    <loc>${baseUrl}${u.loc}</loc>\n    <priority>${u.priority}</priority>\n  </url>`),
    ...places.map((p) => {
      const lastmod = (p.created_at || "").replace(" ", "T");
      return `  <url>\n    <loc>${baseUrl}/place/${p.id}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>0.8</priority>\n  </url>`;
    }),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;

  res.set("Content-Type", "application/xml");
  res.send(xml);
});

export default router;
