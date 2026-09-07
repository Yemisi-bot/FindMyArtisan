import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';

/**
 * Image upload handling.
 *
 * Files are buffered in memory, then pushed to Cloudinary and stored in the
 * database as absolute https URLs. This is what makes uploads survive on hosts
 * with an ephemeral filesystem (Render's free tier has no persistent disk).
 *
 * If Cloudinary is not configured, uploads fall back to local disk under
 * UPLOAD_DIR so local development keeps working without an account.
 */

// Cloudinary reads CLOUDINARY_URL (cloudinary://<key>:<secret>@<cloud_name>)
// from the environment automatically; secure:true forces https URLs.
cloudinary.config({ secure: true });

export const CLOUDINARY_ENABLED = Boolean(
  process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME
);

const CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER || 'findmyartisan';

/** Legacy local upload directory — still served at /uploads for images saved before Cloudinary. */
export const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

if (!CLOUDINARY_ENABLED) {
  console.warn(
    '[Upload] CLOUDINARY_URL is not set — falling back to local disk storage.\n' +
      '         On a host without a persistent disk these images are lost on restart.'
  );
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP or GIF images are allowed.'));
    }
  },
});

/** Write a buffered file to UPLOAD_DIR and return its public path. */
function saveToDisk(file: Express.Multer.File): string {
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), file.buffer);
  return `/uploads/${filename}`;
}

/**
 * Store an uploaded image and return the URL to persist in the database.
 * Cloudinary returns an absolute https URL; the disk fallback returns /uploads/<name>.
 */
export function uploadImage(file: Express.Multer.File): Promise<string> {
  if (!CLOUDINARY_ENABLED) {
    return Promise.resolve(saveToDisk(file));
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: CLOUDINARY_FOLDER, resource_type: 'image' },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary upload failed.'));
          return;
        }
        resolve(result.secure_url);
      }
    );
    stream.end(file.buffer);
  });
}

/** Store several images concurrently, preserving input order. */
export function uploadImages(files: Express.Multer.File[]): Promise<string[]> {
  return Promise.all(files.map(uploadImage));
}

/**
 * Derive a Cloudinary public_id from a delivery URL.
 * https://res.cloudinary.com/<cloud>/image/upload/v123/folder/name.jpg -> folder/name
 */
function cloudinaryPublicId(imageUrl: string): string | null {
  const match = imageUrl.match(/\/upload\/(?:v\d+\/)?(.+)$/);
  if (!match) return null;
  return match[1].replace(/\.[^./]+$/, '');
}

/** Remove a previously uploaded image (best-effort — never throws). */
export function deleteUploadedFile(imageUrl?: string | null): void {
  if (!imageUrl) return;

  if (imageUrl.startsWith('/uploads/')) {
    fs.unlink(path.join(UPLOAD_DIR, path.basename(imageUrl)), () => undefined);
    return;
  }

  if (imageUrl.includes('res.cloudinary.com')) {
    const publicId = cloudinaryPublicId(imageUrl);
    if (!publicId) return;
    // invalidate:true also purges cached copies from the CDN. Without it the
    // asset is removed from storage but keeps serving from edge caches.
    cloudinary.uploader
      .destroy(publicId, { invalidate: true })
      .catch((err) => console.error('[Upload] Cloudinary delete failed:', err?.message ?? err));
  }
  // Any other absolute URL is external — never touch it.
}
