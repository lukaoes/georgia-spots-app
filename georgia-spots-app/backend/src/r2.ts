import path from "path";
import fs from "fs/promises";
import { S3Client, PutObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";

// If R2 credentials are configured, photos are stored there (recommended for production -
// see backend/.env.example). Otherwise they fall back to the local uploads/ folder, which is
// fine for local development but shouldn't be used in production: most hosts don't guarantee
// local disk survives a redeploy, and free persistent disks tend to be small anyway. R2's free
// tier is 10GB, roughly 50,000 photos at this app's compression settings.
export const R2_ENABLED = !!(
  process.env.R2_ACCOUNT_ID &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET_NAME
);

export const s3 = R2_ENABLED
  ? new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
      // Without an explicit timeout, a slow or unreachable R2 endpoint can hang well past
      // whatever timeout the hosting platform's own proxy enforces - the request then dies
      // at the proxy layer with a generic network error instead of a clear message.
      requestHandler: new NodeHttpHandler({ connectionTimeout: 5000, socketTimeout: 15000 }),
      maxAttempts: 2,
    })
  : null;

export const uploadsDir = path.join(__dirname, "..", "uploads");

// Deleting a photo/place/user in the app only ever removed the database row - the actual file
// stayed in R2 (or the local uploads/ folder) forever, slowly accumulating orphaned photos with
// no listing or review pointing at them anymore. This turns a list of stored photo URLs back
// into their filenames and actually removes them from wherever they're stored.
export async function deletePhotoFiles(urls: (string | null | undefined)[]): Promise<void> {
  const filenames = urls
    .filter((u): u is string => !!u)
    .map((u) => u.split("/").pop())
    .filter((f): f is string => !!f);

  if (filenames.length === 0) return;

  if (R2_ENABLED && s3 && process.env.R2_BUCKET_NAME) {
    // DeleteObjectsCommand takes up to 1000 keys per call, which is far more than any single
    // place/user will ever have - one call covers it.
    try {
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Delete: { Objects: filenames.map((Key) => ({ Key })) },
        })
      );
    } catch (err) {
      // Deletion failing shouldn't block the actual place/user/photo deletion the person asked
      // for - worst case is a harmless orphaned file left in the bucket, not a broken request.
      console.error("R2 delete failed:", err);
    }
  } else {
    await Promise.all(
      filenames.map((f) =>
        fs.unlink(path.join(uploadsDir, f)).catch(() => {
          /* already gone or never existed locally - fine either way */
        })
      )
    );
  }
}

export { PutObjectCommand };
