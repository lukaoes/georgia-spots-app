import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth";
import placesRoutes from "./routes/places";
import uploadsRoutes from "./routes/uploads";
import usersRoutes from "./routes/users";
import adminRoutes from "./routes/admin";
import "./db"; // ensures schema is created on boot

const app = express();
const PORT = process.env.PORT || 4000;

const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// In production, set FRONTEND_ORIGIN to your real site's URL(s), comma-separated
// (e.g. "https://vanlife.ge,https://www.vanlife.ge"). Left unset, CORS stays open,
// which is fine for local development but should be locked down once you deploy.
const allowedOrigins = process.env.FRONTEND_ORIGIN?.split(",").map((o) => o.trim());
app.use(
  cors(
    allowedOrigins
      ? { origin: allowedOrigins }
      : undefined
  )
);
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

// General rate limit: slows down bulk scraping/enumeration without affecting normal use.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "მოთხოვნები ძალიან ხშირია, გთხოვთ სცადოთ მოგვიანებით." },
});
app.use("/api", generalLimiter);

// Tighter limit on auth endpoints specifically, to blunt brute-force login/registration attempts.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "მცდელობები ძალიან ხშირია, გთხოვთ სცადოთ მოგვიანებით." },
});
app.use("/api/auth", authLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/places", placesRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || "სერვერის შეცდომა" });
});

app.listen(PORT, () => {
  console.log(`Georgia Spots API listening on http://localhost:${PORT}`);
});
