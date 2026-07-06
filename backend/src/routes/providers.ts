import { Router, Response } from 'express';
import { query } from '../config/database';
import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth';
import { AuthRequest, NearbyQuery } from '../types';
import { imageUpload, publicUrl, deleteUploadedFile } from '../middleware/upload';
import { logActivity } from '../services/activity';

const router = Router();

// Minimum work images an artisan must upload before appearing in search/map
export const MIN_WORK_IMAGES = 3;

// Visibility rule: NOT suspended by an admin + verified email + at least
// MIN_WORK_IMAGES work photos. Artisans go live automatically — no admin
// approval step. Admins can suspend to remove a bad actor.
const VISIBILITY_CLAUSE = `
  p.is_suspended = false
  AND u.email_verified = true
  AND (SELECT COUNT(*) FROM work_images w WHERE w.provider_id = p.id) >= ${MIN_WORK_IMAGES}
`;

// GET /api/categories
router.get('/categories', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'SELECT id, name, slug, icon, description FROM service_categories ORDER BY name'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Categories] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories.' });
  }
});

// GET /api/providers/nearby — Core geolocation endpoint
router.get('/nearby', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      latitude,
      longitude,
      radius = process.env.DEFAULT_SEARCH_RADIUS || '5',
      category,
      q,
      page = '1',
      limit = '20',
    } = req.query as Record<string, string>;

    if (!latitude || !longitude) {
      res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required.',
      });
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radiusKm = Math.min(parseFloat(radius), parseFloat(process.env.MAX_SEARCH_RADIUS || '10'));
    const radiusMeters = radiusKm * 1000;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 50);
    const offset = (pageNum - 1) * limitNum;

    // Use PostGIS ST_DWithin for efficient proximity filtering
    // and ST_Distance for accurate distance calculation
    let whereClause = VISIBILITY_CLAUSE;
    const params: unknown[] = [lng, lat, radiusMeters];

    if (category) {
      params.push(category);
      whereClause += ` AND sc.slug = $${params.length}`;
    }

    if (q && q.trim()) {
      params.push(`%${q.trim()}%`);
      whereClause += ` AND (p.business_name ILIKE $${params.length} OR p.description ILIKE $${params.length} OR sc.name ILIKE $${params.length})`;
    }

    const countQuery = `
      SELECT COUNT(*) as total
      FROM providers p
      JOIN service_categories sc ON p.category_id = sc.id
      JOIN users u ON p.user_id = u.id
      WHERE ${whereClause}
        AND ST_DWithin(p.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
    `;

    const dataQuery = `
      SELECT
        p.id, p.business_name, p.description, p.phone, p.address,
        p.profile_image, p.is_verified, p.average_rating, p.review_count,
        p.created_at,
        ST_X(p.location::geometry) as longitude,
        ST_Y(p.location::geometry) as latitude,
        ST_Distance(
          p.location,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) as distance_meters,
        sc.name as category_name,
        sc.slug as category_slug,
        sc.icon as category_icon,
        (SELECT w.image_url FROM work_images w WHERE w.provider_id = p.id ORDER BY w.created_at ASC LIMIT 1) as cover_image
      FROM providers p
      JOIN service_categories sc ON p.category_id = sc.id
      JOIN users u ON p.user_id = u.id
      WHERE ${whereClause}
        AND ST_DWithin(p.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
      ORDER BY distance_meters ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    // Save search history for logged-in users (fire-and-forget)
    if (req.user && (category || (q && q.trim()))) {
      query(
        `INSERT INTO search_history (user_id, category_slug, search_term, latitude, longitude)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.user.userId, category || null, q?.trim() || null, lat, lng]
      ).catch((e) => console.error('[SearchHistory] Save failed:', e.message));
    }

    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    const dataParams = [...params, limitNum, offset];
    const dataResult = await query(dataQuery, dataParams);

    // Convert distance to km and format response
    const providers = dataResult.rows.map((p) => ({
      ...p,
      distance_km: parseFloat((p.distance_meters / 1000).toFixed(2)),
      distance_meters: Math.round(p.distance_meters),
    }));

    res.json({
      success: true,
      data: providers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('[Providers] Nearby error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch nearby providers.' });
  }
});

// GET /api/providers/me — The logged-in artisan's own profile, catalog and reviews
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT p.*,
              ST_X(p.location::geometry) as longitude,
              ST_Y(p.location::geometry) as latitude,
              sc.name as category_name, sc.slug as category_slug, sc.icon as category_icon,
              u.email_verified
       FROM providers p
       JOIN service_categories sc ON p.category_id = sc.id
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id = $1`,
      [req.user!.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'You have no artisan profile yet.' });
      return;
    }

    const provider = result.rows[0];

    const images = await query(
      'SELECT id, image_url, caption, created_at FROM work_images WHERE provider_id = $1 ORDER BY created_at ASC',
      [provider.id]
    );

    const reviews = await query(
      `SELECT r.id, r.rating, r.comment, r.image_url, r.created_at, u.full_name as reviewer_name
       FROM reviews r JOIN users u ON r.user_id = u.id
       WHERE r.provider_id = $1 ORDER BY r.created_at DESC LIMIT 50`,
      [provider.id]
    );

    const imageCount = images.rows.length;
    res.json({
      success: true,
      data: {
        ...provider,
        work_images: images.rows,
        reviews: reviews.rows,
        visibility: {
          email_verified: provider.email_verified,
          images_uploaded: imageCount,
          images_required: MIN_WORK_IMAGES,
          is_suspended: provider.is_suspended,
          is_visible: !provider.is_suspended && provider.email_verified && imageCount >= MIN_WORK_IMAGES,
        },
      },
    });
  } catch (error) {
    console.error('[Providers] Get own profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch your profile.' });
  }
});

// POST /api/providers/me/images — Upload work images (catalog), up to 6 per request
router.post(
  '/me/images',
  authenticate,
  imageUpload.array('images', 6),
  async (req: AuthRequest, res: Response) => {
    try {
      const files = (req.files as Express.Multer.File[]) || [];
      if (files.length === 0) {
        res.status(400).json({ success: false, message: 'Please attach at least one image.' });
        return;
      }

      const provider = await query('SELECT id FROM providers WHERE user_id = $1', [req.user!.userId]);
      if (provider.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Create your artisan profile first.' });
        return;
      }
      const providerId = provider.rows[0].id;

      const inserted = [];
      for (const file of files) {
        const result = await query(
          'INSERT INTO work_images (provider_id, image_url) VALUES ($1, $2) RETURNING id, image_url, caption, created_at',
          [providerId, publicUrl(file.filename)]
        );
        inserted.push(result.rows[0]);
      }

      const countResult = await query('SELECT COUNT(*) as c FROM work_images WHERE provider_id = $1', [providerId]);
      const total = parseInt(countResult.rows[0].c);

      res.status(201).json({
        success: true,
        message:
          total >= MIN_WORK_IMAGES
            ? 'Images uploaded. Your catalog meets the visibility requirement.'
            : `Images uploaded. Upload ${MIN_WORK_IMAGES - total} more to become visible in search.`,
        data: { images: inserted, total_images: total, images_required: MIN_WORK_IMAGES },
      });
    } catch (error) {
      console.error('[Providers] Image upload error:', error);
      res.status(500).json({ success: false, message: 'Failed to upload images.' });
    }
  }
);

// DELETE /api/providers/me/images/:imageId — Remove a work image
router.delete('/me/images/:imageId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `DELETE FROM work_images w
       USING providers p
       WHERE w.id = $1 AND w.provider_id = p.id AND p.user_id = $2
       RETURNING w.image_url`,
      [req.params.imageId, req.user!.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Image not found.' });
      return;
    }

    deleteUploadedFile(result.rows[0].image_url);
    res.json({ success: true, message: 'Image removed.' });
  } catch (error) {
    console.error('[Providers] Image delete error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove image.' });
  }
});

// POST /api/providers/:id/contact-click — User revealed this artisan's number.
// Saved so the user can come back later and leave a review.
router.post('/:id/contact-click', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const provider = await query('SELECT id, phone FROM providers WHERE id = $1', [req.params.id]);
    if (provider.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Provider not found.' });
      return;
    }

    await query(
      `INSERT INTO contact_clicks (user_id, provider_id) VALUES ($1, $2)
       ON CONFLICT (user_id, provider_id) DO NOTHING`,
      [req.user!.userId, req.params.id]
    );

    res.json({ success: true, data: { phone: provider.rows[0].phone } });
  } catch (error) {
    console.error('[Providers] Contact click error:', error);
    res.status(500).json({ success: false, message: 'Failed to record contact.' });
  }
});

// GET /api/providers/contacted/list — Artisans whose numbers this user revealed
router.get('/contacted/list', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT p.id, p.business_name, p.phone, p.average_rating, p.review_count,
              sc.name as category_name, sc.icon as category_icon,
              cc.created_at as contacted_at,
              (SELECT r.id FROM reviews r WHERE r.provider_id = p.id AND r.user_id = $1) as my_review_id
       FROM contact_clicks cc
       JOIN providers p ON cc.provider_id = p.id
       JOIN service_categories sc ON p.category_id = sc.id
       WHERE cc.user_id = $1
       ORDER BY cc.created_at DESC
       LIMIT 50`,
      [req.user!.userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Providers] Contacted list error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch contacted artisans.' });
  }
});

// GET /api/providers/searches/recent — The user's recent searches
router.get('/searches/recent', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT DISTINCT ON (COALESCE(category_slug, ''), COALESCE(search_term, ''))
              id, category_slug, search_term, created_at
       FROM search_history
       WHERE user_id = $1
       ORDER BY COALESCE(category_slug, ''), COALESCE(search_term, ''), created_at DESC
       LIMIT 10`,
      [req.user!.userId]
    );
    // Most recent first
    const rows = result.rows.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[Providers] Search history error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch search history.' });
  }
});

// GET /api/providers/:id
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT
        p.*,
        ST_X(p.location::geometry) as longitude,
        ST_Y(p.location::geometry) as latitude,
        sc.name as category_name,
        sc.slug as category_slug,
        sc.icon as category_icon,
        u.full_name as provider_name,
        u.email as provider_email
      FROM providers p
      JOIN service_categories sc ON p.category_id = sc.id
      JOIN users u ON p.user_id = u.id
      WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Provider not found.' });
      return;
    }

    // Get reviews for this provider
    const reviewsResult = await query(
      `SELECT r.id, r.rating, r.comment, r.image_url, r.created_at,
              u.full_name as reviewer_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.provider_id = $1
       ORDER BY r.created_at DESC
       LIMIT 20`,
      [id]
    );

    // Work image catalog
    const imagesResult = await query(
      'SELECT id, image_url, caption, created_at FROM work_images WHERE provider_id = $1 ORDER BY created_at ASC',
      [id]
    );

    // Viewer state: has this user revealed the number / already reviewed?
    let hasContacted = false;
    let hasReviewed = false;
    if (req.user) {
      const contact = await query(
        'SELECT 1 FROM contact_clicks WHERE user_id = $1 AND provider_id = $2',
        [req.user.userId, id]
      );
      hasContacted = contact.rows.length > 0;
      const myReview = await query(
        'SELECT 1 FROM reviews WHERE user_id = $1 AND provider_id = $2',
        [req.user.userId, id]
      );
      hasReviewed = myReview.rows.length > 0;
    }

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        reviews: reviewsResult.rows,
        work_images: imagesResult.rows,
        viewer: { has_contacted: hasContacted, has_reviewed: hasReviewed },
      },
    });
  } catch (error) {
    console.error('[Providers] Get provider error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch provider details.' });
  }
});

// POST /api/providers — Register a new provider
// Accepts multipart/form-data so the artisan can upload a profile photo directly
// (field name "profileImage"). Text fields are still read from req.body. An
// optional "profileImage" URL string is kept for backward compatibility.
router.post('/', authenticate, imageUpload.single('profileImage'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      businessName,
      categoryId,
      customCategory,
      description,
      phone,
      address,
      latitude,
      longitude,
      profileImage,
    } = req.body;

    // Prefer an uploaded file; fall back to a provided URL, else null.
    const resolvedProfileImage = req.file
      ? publicUrl(req.file.filename)
      : (typeof profileImage === 'string' && profileImage.trim() ? profileImage.trim() : null);

    // Validation — a category is required either as an existing id or a custom name
    if (!businessName || (!categoryId && !customCategory) || !phone || !address || !latitude || !longitude) {
      res.status(400).json({
        success: false,
        message: 'All required fields must be provided.',
      });
      return;
    }

    // Resolve the category: use the existing one, or create a new one from the custom name
    let resolvedCategoryId = categoryId as string | undefined;
    if (customCategory && String(customCategory).trim()) {
      const name = String(customCategory).trim().slice(0, 50);
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      if (!slug) {
        res.status(400).json({ success: false, message: 'Invalid category name.' });
        return;
      }

      // Insert if new (idempotent), then fetch the id whether new or pre-existing
      await query(
        `INSERT INTO service_categories (name, slug, icon, description)
         VALUES ($1, $2, '🛠️', 'Community-added category')
         ON CONFLICT (slug) DO NOTHING`,
        [name, slug]
      );
      const catResult = await query('SELECT id FROM service_categories WHERE slug = $1', [slug]);
      resolvedCategoryId = catResult.rows[0]?.id;
    }

    if (!resolvedCategoryId) {
      res.status(400).json({ success: false, message: 'Could not resolve service category.' });
      return;
    }

    // Check if user already has a provider profile
    const existing = await query('SELECT id FROM providers WHERE user_id = $1', [req.user!.userId]);
    if (existing.rows.length > 0) {
      res.status(409).json({
        success: false,
        message: 'You already have a provider profile.',
      });
      return;
    }

    // Create provider with geography point
    const result = await query(
      `INSERT INTO providers (user_id, business_name, category_id, description, phone, address, location, profile_image)
       VALUES ($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_MakePoint($7, $8), 4326)::geography, $9)
       RETURNING id, business_name, is_verified, created_at`,
      [req.user!.userId, businessName, resolvedCategoryId, description, phone, address, longitude, latitude, resolvedProfileImage]
    );

    // Creating a business makes this account an artisan — upgrade the role so
    // the app surfaces "My Business" instead of "Become an Artisan".
    await query(`UPDATE users SET role = 'provider' WHERE id = $1 AND role = 'user'`, [req.user!.userId]);

    logActivity(req.user!.userId, 'provider_created', 'provider', result.rows[0].id, {
      businessName: result.rows[0].business_name,
    });

    res.status(201).json({
      success: true,
      message: 'Provider profile created. Awaiting admin verification.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('[Providers] Registration error:', error);
    res.status(500).json({ success: false, message: 'Failed to create provider profile.' });
  }
});

// GET /api/providers — List all providers (for admin/reference)
router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT p.*, sc.name as category_name, sc.icon as category_icon,
              ST_X(p.location::geometry) as longitude, ST_Y(p.location::geometry) as latitude
       FROM providers p
       JOIN service_categories sc ON p.category_id = sc.id
       ORDER BY p.created_at DESC
       LIMIT 50`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Providers] List error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch providers.' });
  }
});

export default router;
