import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

/**
 * Image upload handling — multer disk storage.
 *
 * Files are stored in UPLOAD_DIR (default: <project>/uploads). On Railway,
 * mount a persistent Volume and set UPLOAD_DIR to its mount path (e.g. /data/uploads)
 * so images survive redeploys. They are served statically at /uploads/*.
 */

export const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');

// Ensure the directory exists at startup
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

export const imageUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP or GIF images are allowed.'));
    }
  },
});

/** Public URL path for an uploaded file. */
export function publicUrl(filename: string): string {
  return `/uploads/${filename}`;
}

/** Delete an uploaded file from disk (best-effort). */
export function deleteUploadedFile(imageUrl: string): void {
  if (!imageUrl.startsWith('/uploads/')) return; // never touch external URLs
  const filePath = path.join(UPLOAD_DIR, path.basename(imageUrl));
  fs.unlink(filePath, () => undefined);
}
