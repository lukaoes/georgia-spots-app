import { Router } from "express";
import multer from "multer";
import path from "path";
import sharp from "sharp";
import { v4 as uuid } from "uuid";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Accept uploads in memory, then compress + resize with sharp before storing.
// This is what keeps storage small: photos are re-encoded to webp, capped at 1600px
// on the long edge, which typically cuts a phone photo from several MB down to ~100-350KB.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) return cb(new Error("დაშვებულია მხოლოდ სურათები (jpg, png, webp)"));
    cb(null, true);
  },
});

// If R2 credentials are configured, photos are stored there (recommended for production -
// see backend/.env.example). Otherwise they fall back to the local uploads/ folder, which is
// fine for local development but shouldn't be used in production: most hosts (including the
// free tier this project is meant to run on) don't guarantee local disk survives a redeploy,
// and its free persistent disk is small anyway - a few hundred photos at most. R2's free tier
// is 10GB, roughly 50,000 photos at this app's compression settings.
const R2_ENABLED = !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME);

const s3 = R2_ENABLED
  ? new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })
  : null;

const uploadsDir = path.join(__dirname, "..", "..", "uploads");

// Small text watermark in the bottom-right corner, so a saved/scraped photo still points back
// to the site. Built as an SVG and composited with sharp rather than using a static image file,
// so it scales cleanly with photos of any size and needs no extra asset to ship.
// Not applied to avatars (req.body.context === "avatar") - a watermark on someone's profile
// picture would be pointless (it's not "content" anyone would scrape) and just looks bad.
const WATERMARK_TEXT = process.env.WATERMARK_TEXT || "vanlife.ge";

function watermarkSvg(width: number, height: number) {
  // Font size and margin scale with the image so the mark looks consistent across a tiny
  // review photo and a full-size cover photo, instead of being tiny on some and huge on others.
  const fontSize = Math.max(14, Math.round(width * 0.035));
  const margin = Math.round(fontSize * 0.9);
  const x = width - margin;
  const y = height - margin;
  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="${x}" y="${y}" text-anchor="end" font-family="sans-serif" font-weight="600"
            font-size="${fontSize}" fill="rgba(255,255,255,0.82)"
            stroke="rgba(0,0,0,0.55)" stroke-width="${Math.max(1, fontSize * 0.06)}"
            paint-order="stroke">${WATERMARK_TEXT}</text>
    </svg>
  `);
}

router.post("/", requireAuth, upload.array("photos", 6), async (req, res) => {
  const files = (req.files as Express.Multer.File[]) || [];
  const isAvatar = req.body?.context === "avatar";
  try {
    const urls: string[] = [];
    for (const file of files) {
      const filename = `${uuid()}.webp`;
      const { data: resized, info } = await sharp(file.buffer)
        .rotate() // respect EXIF orientation
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .toBuffer({ resolveWithObject: true });

      let out = sharp(resized);
      if (!isAvatar) {
        out = out.composite([{ input: watermarkSvg(info.width, info.height), gravity: "southeast" }]);
      }

      const buffer = await out.webp({ quality: 78 }).toBuffer();

      if (R2_ENABLED && s3) {
        await s3.send(
          new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: filename,
            Body: buffer,
            ContentType: "image/webp",
          })
        );
        urls.push(`${process.env.R2_PUBLIC_URL}/${filename}`);
      } else {
        const fs = await import("fs/promises");
        await fs.writeFile(path.join(uploadsDir, filename), buffer);
        urls.push(`/uploads/${filename}`);
      }
    }
    res.status(201).json({ urls });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "სურათის დამუშავება ვერ მოხერხდა" });
  }
});

export default router;
