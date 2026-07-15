# სად დავდგე — Georgia Camper Spots

A crowdsourced map of campsites, wild spots, and overnight parking for campervans/overlanders in Georgia (the country). Built like park4night, but scoped to Georgia only, no booking, no premium tier, fully in Georgian.

## What's inside

- **`backend/`** — Node.js + Express + TypeScript API, using SQLite as the database (no separate database server to install). Handles accounts, places, filters, reviews, photo uploads, and reporting.
- **`frontend/`** — React + Vite + TypeScript app with a Leaflet map (OpenStreetMap tiles, free, no API key needed), Tailwind CSS styling, Georgian UI throughout.

The app is already seeded with 12 real Georgian locations (Kazbegi, Svaneti, Kakheti, Batumi, Borjomi, Vashlovani, etc.) so the map isn't empty when you first run it.

---

## 1. Prerequisites

You need **Node.js version 18 or newer** installed on your computer.

Check if you have it:
```bash
node -v
```
If that fails or shows a version below 18, install Node.js from https://nodejs.org (choose the "LTS" version) and try again.

You do **not** need to install PostgreSQL, MySQL, or anything else — the backend uses a local SQLite file that gets created automatically.

---

## 2. First-time setup

Open a terminal in the project folder (the one containing `backend/` and `frontend/`).

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run seed
```

- `npm install` downloads all backend dependencies (takes a minute).
- `cp .env.example .env` creates your local config file. Open `.env` and change `JWT_SECRET` to any long random string before you show this to real users (it's fine to leave the default while just testing locally).
- `npm run seed` creates the database file and fills it with the 12 sample Georgian locations, plus a demo **admin** login: **demo@georgiaspots.ge / password123**. It's safe to run this only once — if you run it again it will just say data already exists and do nothing.

> **Updating from an earlier version of this project?** The database structure changed (new columns for profiles, regions, favorites, etc.) — delete your old `backend/data.sqlite` (and any `-wal`/`-shm` files next to it) before running `npm run seed` again, otherwise the server will error on startup.

### Frontend

Open a **second terminal window** (keep it separate from the backend one):

```bash
cd frontend
npm install
```

---

## 3. Running the app

You need **both** servers running at the same time, in two separate terminal windows.

**Terminal 1 — backend:**
```bash
cd backend
npm run dev
```
You should see: `Georgia Spots API listening on http://localhost:4000`

**Terminal 2 — frontend:**
```bash
cd frontend
npm run dev
```
You should see a line like `Local: http://localhost:5173/`

Now open **http://localhost:5173** in your browser. You should see the map of Georgia with pins already on it.

To stop either server, click into its terminal and press `Ctrl+C`.

Every time you want to work on the app again later, you just repeat this step (no need to run `npm install` or `npm run seed` again, unless you delete `node_modules` or the database file).

---

## 4. Trying it out

1. Click **"რეგისტრაცია"** (Register) to create an account, or log in with the demo **admin** account (`demo@georgiaspots.ge` / `password123`). Registration now also asks for a **unique username** (3-24 characters, lowercase letters/numbers/underscore — this becomes your public profile URL, `/users/yourname`; duplicates are rejected the same way duplicate emails are) and requires checking a **leave-no-trace pledge** checkbox before the account can be created — this applies to Google sign-in too, which only appears once the box is checked.
2. **Anonymous visitors can still browse the map** and see a pin's preview (name, category, price) in its popup, but clicking through to the full details prompts them to register or log in — either as a popup while browsing the map/list, or as an inline "sign in to view" screen if they land directly on a place's URL.
3. Click **"+ ადგილის დამატება"** (Add a place) to add a new spot: click the map to drop a pin, fill in the form, optionally attach photos, and submit. **New places go into a "pending" queue and are not visible on the public map until an admin approves them.** When approved, a **region** (e.g. Kakheti, Adjara, Svaneti...) is automatically assigned based on its coordinates, and becomes usable as a filter.
4. Log in as the demo admin and open **"ადმინი"** in the header — you can approve/reject pending places, confirm or deny deletion requests, review flagged reports, manage users (promote to admin, delete, search, or issue a temporary password), and view password-recovery requests.
5. Click any pin, then "დეტალურად" (details) for the full place page: leave a star rating + review with photos, click any photo to **zoom in**, favorite (♥) or mark visited (✓), switch the map between **standard and satellite view**, open the exact coordinates in Google Maps, or report a problem. If you own the place (or you're an admin), you'll also see edit/delete buttons.
6. Click your name/avatar in the header to open **your own profile** — it now lives at `/users/yourusername` (same URL anyone else would see, so it's directly copyable/shareable — click the small link icon next to your username to copy it). From there you can edit your name, username, email, avatar, bio, and social links (Instagram/YouTube/Facebook/TikTok, all optional), toggle whether your favorites/visited lists are public or private, and browse your own added places (including pending/rejected ones, which only you can see there), favorites, visited places, and reviews.
7. Click **any other user's name** (from a place's "added by" line, or the admin users table) to view their **public profile** at `/users/theirusername`.
8. Use "ფილტრები" (Filters) to narrow the map by category, region, price, services, road difficulty, etc.

### How edit/delete works for regular users vs admins

- **Owner edits an approved place** → the change is saved, but the place is pulled back into the "pending" queue and disappears from the public map until an admin re-approves it (so edits can't be used to sneak in spam either).
- **Owner deletes an approved place** → it doesn't vanish immediately. It's pulled from the public map and queued as a "deletion request" for an admin to confirm or deny (visible under the admin panel's "წაშლის მოთხოვნები" tab). If the place was still pending or already rejected (never public), deleting it is immediate — there's nothing to protect.
- **Admin edits or deletes any place** → applied immediately, no queue.

### How the region auto-labeling works

When an admin approves a place, its coordinates are matched to the nearest of ~28 known anchor towns spread across Georgia's regions (Tbilisi, Kakheti, Adjara, Svaneti, etc. — all offline, no external geocoding API, no network dependency). This is a practical approximation rather than exact administrative polygon boundaries, so a place sitting very close to a real regional border might occasionally get labeled with its neighboring region. Good enough for filtering and browsing; not meant to be authoritative. If you'd rather use a different set of regions/cities than Georgia's standard 9 mkhare + Tbilisi, the list lives in `backend/src/regions.ts` and is easy to swap out.

### "Sign in with Google" (optional)

This is off by default because it requires your own free Google Cloud credentials. To turn it on:

1. Go to https://console.cloud.google.com/apis/credentials, create a project if you don't have one, and create an **OAuth 2.0 Client ID** of type "Web application".
2. Under "Authorized JavaScript origins" add `http://localhost:5173` (and later, your real domain once deployed).
3. Copy the generated Client ID.
4. Paste it into **both**:
   - `backend/.env` → `GOOGLE_CLIENT_ID=...`
   - `frontend/.env` → `VITE_GOOGLE_CLIENT_ID=...` (copy `frontend/.env.example` to `frontend/.env` first if you haven't)
5. Restart both `npm run dev` processes. A "Continue with Google" button will now appear on the login/register pages automatically. If you skip this setup, the app works exactly the same with email/password accounts — the button just won't render.

### Password recovery (built)

Since sending real emails was explicitly off the table, this works as a manual, admin-mediated flow instead of automatic email delivery — and the person sets their **own** password rather than being handed a random one:

1. A person who forgot their password clicks **"დაგავიწყდათ პაროლი?"** on the login page, and submits their email + username (+ an optional note).
2. That request lands in the admin panel's **"პაროლის აღდგენა"** tab. If a matching account is found (by email or username), it's shown directly on the request.
3. The admin clicks **"აღდგენის ბმულის გენერაცია"** — either right there on the matched request, or from the Users tab (which now also has a search box and a per-user link button) — and the app generates a one-time reset link, valid for 48 hours, and shows it in a small popup with a **copy button** (`navigator.clipboard`, with a text-select fallback if clipboard access isn't available).
4. The admin copies that link and sends it to the person themselves (email, Instagram DM, WhatsApp, however you'd normally reach them) — there's no automatic email step, by design.
5. The person opens the link, lands on a page that shows their username/email (read-only, so they know it's the right account) and lets them **type their own new password** — nothing is auto-generated for them. The link can only be used once and expires automatically after 48 hours.

This is intentionally lightweight rather than fully self-service, since it avoids needing any email-sending infrastructure at all. If your user base grows and manually resetting passwords becomes a burden, a self-service one-time recovery code (generated and shown once at signup, saved by the user themselves) would be the natural next step — but that's not built.

---

## 5. Where things are stored

- **Database**: `backend/data.sqlite` — a single file containing all users, places, reviews, favorites, visits, and reports. You can back it up by just copying this file.
- **Uploaded photos**: `backend/uploads/` — every uploaded photo (place photos, review photos, and profile avatars) is automatically **compressed and resized** on upload (converted to WebP, capped at 1600px on the longest side, ~78% quality) before being saved, so a multi-megabyte phone photo typically shrinks to a few hundred KB.

If you ever want a completely fresh start, stop the backend, delete `backend/data.sqlite` (and the `-wal`/`-shm` files next to it if present), and run `npm run seed` again.

---

## 6. Going live: step-by-step deployment guide

This is the actual path to get `vanlife.ge` running for real, as cheaply as possible: **Cloudflare Pages** for the frontend (free), **Northflank** for the backend (free tier: Node + persistent disk, no code changes needed), **Cloudflare R2** for photo storage (free, 10GB ≈ 50,000 photos at this app's compression settings), and your domain added at the end once everything else works. Total recurring cost: **just the domain**.

> Free tiers change their terms sometimes — if Northflank's free plan ever tightens up, the fallback is a ~$3-5/month VPS (e.g. Hetzner), which runs this exact code with zero changes.

### Step 1 — Push the code to GitHub

Both platforms below deploy by connecting to a GitHub repository. If you haven't already:
```bash
cd georgia-spots-app
git init
git add .
git commit -m "Initial commit"
```
Create a new repository on GitHub, then follow its instructions to push (`git remote add origin ...`, `git push -u origin main`).

### Step 2 — Cloudflare R2 (photo storage)

1. Sign up at https://dash.cloudflare.com (a credit card is required to activate R2, even on the free tier — you won't be charged unless you exceed 10GB).
2. Go to **R2** in the sidebar → **Create bucket**. Name it something like `vanlife-photos`.
3. Open the bucket → **Settings** → enable **public access** (either the bucket's `r2.dev` public URL, or a custom domain like `photos.vanlife.ge` if you want one — either works, just note the resulting public URL).
4. Go to **R2** → **Manage API tokens** → **Create API token**, scoped to this bucket, with read+write permissions. Note the **Access Key ID**, **Secret Access Key**, and your **Account ID** (shown in the R2 dashboard sidebar).

### Step 3 — Backend on Northflank

1. Sign up at https://northflank.com with your GitHub account.
2. **Create project** → **Create service** → **Deployment** → connect your repository, set the root directory to `backend`.
3. Northflank should auto-detect Node.js. Set the **build command** to `npm install && npm run build` and the **start command** to `npm start`.
4. Add a **persistent volume**, mounted at e.g. `/data` (this is what keeps your SQLite database across redeploys — it's small, so the free tier's volume is plenty for the database itself; photos go to R2, not here).
5. Under **environment variables**, add:
   ```
   PORT=4000
   JWT_SECRET=<generate a long random string>
   DB_PATH=/data/data.sqlite
   FRONTEND_ORIGIN=https://vanlife.ge,https://www.vanlife.ge
   R2_ACCOUNT_ID=<from step 2>
   R2_ACCESS_KEY_ID=<from step 2>
   R2_SECRET_ACCESS_KEY=<from step 2>
   R2_BUCKET_NAME=vanlife-photos
   R2_PUBLIC_URL=<your bucket's public URL from step 2>
   ```
   (Leave `GOOGLE_CLIENT_ID` out for now — add it later if you set up Google sign-in.)
6. Deploy. Once it's live, open a terminal/shell for the service (Northflank provides one in its dashboard) and run `npm run seed` once, to create the database and demo admin account.
7. Note the public URL Northflank gives your service (something like `https://<service>.northflank.app`) — you'll need it in the next step.

### Step 4 — Frontend on Cloudflare Pages

1. In the Cloudflare dashboard, go to **Workers & Pages** → **Create** → **Pages** → connect the same GitHub repo.
2. Set the root directory to `frontend`, build command to `npm run build`, output directory to `dist`.
3. Add an environment variable:
   ```
   VITE_API_URL=https://<your-northflank-service-url>
   ```
   (No trailing slash. Add `VITE_GOOGLE_CLIENT_ID` too if you're using Google sign-in.)
4. Deploy. Cloudflare gives you a temporary URL like `vanlife.pages.dev` — confirm the site loads and talks to the backend before moving on.

### Step 5 — Buy and connect the domain

1. Register `vanlife.ge` — as a local registrant, **domenebi.ge** (an official `.ge` registrar operating in Georgia) should be your cheapest, simplest option; going through a foreign reseller usually costs more since they charge for a "local presence" service you don't actually need.
2. In Cloudflare Pages → your project → **Custom domains** → add `vanlife.ge` (and `www.vanlife.ge` if you want both). Cloudflare will show you DNS records to add.
3. At your domain registrar, either point the domain's nameservers at Cloudflare (recommended — simplest, and gives you free DDoS protection/CDN too), or add the specific DNS records Cloudflare shows you if you'd rather keep DNS elsewhere.
4. Once DNS propagates (can take a few hours), update `FRONTEND_ORIGIN` on Northflank to your real domain if you haven't already, and redeploy the backend so CORS allows it.

### After going live

- If you enable Google sign-in, add your real domain (`https://vanlife.ge`) as an authorized JavaScript origin in the Google Cloud OAuth settings, alongside `localhost:5173`.
- Log in as the demo admin, promote your real account to admin from the admin panel's Users tab, and consider changing the demo account's password (or just don't tell anyone the demo credentials).
- Seed data: the 12 demo places are meant as a starting point, not permanent content — edit or remove them once real listings come in.

None of this is required to use and test the app locally — it's only needed once you want other people to access it over the internet.

---

## 7. Feature checklist (what's built)

- Interactive Georgia-only map with custom pin icons, clustering handled by zoom, and a **standard/satellite view toggle**
- Add-a-place flow: click-to-drop-pin → exact lat/lng saved automatically
- **Admin-gated moderation**: new places start "pending" and stay invisible publicly until approved; reported places (3+ reports) automatically return to the pending queue
- **Owner edit/delete requires admin confirmation**; admin edit/delete is immediate
- **Automatic region labeling** (offline, no external API) assigned on approval, usable as a filter and shown in the place list
- **Unique usernames** — required at signup, checked for uniqueness like email, used for clean public profile URLs (`/users/yourname`) instead of raw IDs
- **Leave-no-trace pledge** required at signup (email/password and Google both), enforced server-side too
- **Anonymous browsing with an auth gate**: logged-out visitors can see pins and popup previews on the map, but viewing a place's full details prompts them to register or log in
- **Password recovery via one-time links, not random passwords**: the person sets their own new password on a dedicated page (prefilled with their username/email for confirmation), reached through an admin-generated, single-use, 48-hour link — copied via an in-app popup with a copy button, not a plain browser `alert()`
- **Admin panel**: approve/reject/delete places, confirm/deny deletion requests, view and dismiss reports, **search/view/delete users, promote/demote admins, generate password-reset links**, and review password-recovery requests
- **User profiles now live at `/users/yourusername`** for everyone including yourself (no separate `/profile` URL to worry about) — directly copyable/shareable, with a one-click copy button next to your own username. Editable: name, username, email, avatar photo, bio, social links (Instagram/YouTube/Facebook/TikTok — all optional). Always visible: your added places (with approval status, visible only to you and admins if not yet approved), your reviews. Independently toggleable public/private: your favorited and visited places.
- **Favorites** and an **"I've been here" visit log** (leaving a review also auto-logs a visit)
- Full filter set: category, region, free/paid, vehicle type, road difficulty, surface, environment, quietness, ground level, open-all-year, pets allowed, shade, and all 7 service types
- **Photo upload on places, reviews, and profile avatars**, automatically compressed/resized server-side (WebP, max 1600px) to keep storage small
- **Click any photo to zoom in** (full-screen lightbox with keyboard/arrow navigation)
- Star ratings + written reviews
- **Direct "open in Google Maps" link** on every place's coordinates
- Report/flag a place, explicitly routed to the admin panel's reports tab
- Email/password accounts, plus optional **"Sign in with Google"**
- "Near me" geolocation search
- Map view and list view toggle
- **Icons throughout instead of emoji** (via lucide-react, plus a few hand-drawn brand icons for social links)
- Fully in Georgian, minimalist nature-toned design (forest green, moss, clay, muted gold, stone), no dark mode, no premium tier, no booking
- Mobile-viewport-aware layout (fixed a bug where the satellite toggle button sat below the fold on phones with a dynamic browser toolbar)
- **Security hardening**: place details (full description, photos, reviews) require login on the server, not just in the UI — the map/list still shows public pin previews to anyone, but the detail API itself now rejects anonymous requests, so the "log in to view details" prompt can't be bypassed by calling the API directly. Rate limiting on all API routes (tighter on auth endpoints) to blunt scripted scraping and brute-force attempts. Configurable CORS origin for production.
- **Cloudflare R2 support for photo storage** (falls back to local disk automatically if R2 isn't configured, so local development needs no setup)

Not built yet: self-service password reset without admin involvement, offline map download, multi-language toggle, native mobile apps.
