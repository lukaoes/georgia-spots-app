import { Helmet } from "react-helmet-async";

const SITE_NAME = "Vanlife.Ge";

// Computed at runtime rather than hardcoded, so canonical/OG URLs are always correct for
// whichever domain is actually serving the page (georgia-spots-app.vercel.app today,
// vanlife.ge later) without needing a code change when that switches.
function siteOrigin() {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://vanlife.ge";
}

interface SEOProps {
  title: string;
  description: string;
  path: string; // e.g. "/place/abc123" - used to build the canonical URL and og:url
  image?: string; // absolute URL to a representative photo, falls back to the site default
  type?: "website" | "article" | "profile";
  noindex?: boolean; // for account/admin/auth pages that shouldn't appear in search results
  structuredData?: object | object[]; // JSON-LD, e.g. schema.org Campground/TouristAttraction
}

// IMPORTANT CAVEAT (documented here since it's easy to assume this "just works"): this sets
// tags client-side, after JS runs. Google's crawler renders JS and reads these correctly, so
// this covers real search-engine SEO. Social share scrapers (Facebook, Twitter/X, Slack,
// WhatsApp link previews, etc.) generally do NOT execute JavaScript - they read whatever's in
// the initial HTML response, which is index.html's static tags, not these per-page ones. Getting
// correct per-place preview cards on social shares would need server-side rendering or a
// prerendering step, which is a bigger architectural change than this component alone can cover.
export function SEO({ title, description, path, image, type = "website", noindex, structuredData }: SEOProps) {
  const url = `${siteOrigin()}${path}`;
  const fullTitle = path === "/" ? title : `${title} | ${SITE_NAME}`;
  const ogImage = image || `${siteOrigin()}/og-default.png`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow"} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content="ka_GE" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}
