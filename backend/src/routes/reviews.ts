import { Router, Response } from 'express';
import { query } from '../config/database';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';
import { imageUpload, publicUrl } from '../middleware/upload';
import { logActivity } from '../services/activity';

const router = Router();

// POST /api/reviews — Submit a review (multipart: optional proof-of-work photo)
router.post('/', authenticate, imageUpload.single('image'), async (req: AuthRequest, res: Response) => {
  try {
    const { providerId, comment } = req.body;
    const rating = parseInt(req.body.rating, 10);
    const userId = req.user!.userId;
    const imageFile = req.file as Express.Multer.File | undefined;

    // Validation
    if (!providerId || !rating) {
      res.status(400).json({
        success: false,
        message: 'Provider ID and rating are required.',
      });
      return;
    }

    if (rating < 1 || rating > 5) {
      res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5.',
      });
      return;
    }

    // Check provider exists and isn't suspended
    const provider = await query(
      'SELECT p.id, p.business_name FROM providers p WHERE p.id = $1 AND p.is_suspended = false',
      [providerId]
    );
    if (provider.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Provider not found.' });
      return;
    }

    // Reviews require prior contact: the user must have revealed this
    // artisan's number (recorded as a contact click) before reviewing.
    const contacted = await query(
      'SELECT 1 FROM contact_clicks WHERE user_id = $1 AND provider_id = $2',
      [userId, providerId]
    );
    if (contacted.rows.length === 0) {
      res.status(403).json({
        success: false,
        message: 'You can only review artisans you have contacted. Reveal their number first.',
      });
      return;
    }

    // Try to insert review (unique constraint prevents duplicates)
    try {
      const result = await query(
        `INSERT INTO reviews (provider_id, user_id, rating, comment, image_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, rating, comment, image_url, created_at`,
        [providerId, userId, rating, comment || null, imageFile ? publicUrl(imageFile.filename) : null]
      );

      // Update provider aggregate rating
      await query(
        `UPDATE providers
         SET average_rating = (
           SELECT ROUND(AVG(rating)::numeric, 2)
           FROM reviews
           WHERE provider_id = $1
         ),
         review_count = (
           SELECT COUNT(*) FROM reviews WHERE provider_id = $1
         )
         WHERE id = $1`,
        [providerId]
      );

      logActivity(userId, 'review_submitted', 'provider', providerId, {
        rating,
        providerName: provider.rows[0].business_name,
      });

      res.status(201).json({
        success: true,
        message: 'Review submitted successfully.',
        data: result.rows[0],
      });
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === '23505') {
        res.status(409).json({
          success: false,
          message: 'You have already reviewed this provider.',
        });
        return;
      }
      throw err;
    }
  } catch (error) {
    console.error('[Reviews] Submit error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit review.' });
  }
});

// GET /api/reviews/provider/:providerId
router.get('/provider/:providerId', async (req: AuthRequest, res: Response) => {
  try {
    const { providerId } = req.params;
    const { page = '1', limit = '10' } = req.query as Record<string, string>;

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 20);
    const offset = (pageNum - 1) * limitNum;

    const countResult = await query(
      'SELECT COUNT(*) as total FROM reviews WHERE provider_id = $1',
      [providerId]
    );
    const total = parseInt(countResult.rows[0].total);

    const result = await query(
      `SELECT r.id, r.rating, r.comment, r.image_url, r.created_at,
              u.full_name as reviewer_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.provider_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [providerId, limitNum, offset]
    );

    // Get rating distribution
    const distribution = await query(
      `SELECT rating, COUNT(*) as count
       FROM reviews
       WHERE provider_id = $1
       GROUP BY rating
       ORDER BY rating DESC`,
      [providerId]
    );

    res.json({
      success: true,
      data: result.rows,
      distribution: distribution.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('[Reviews] Get reviews error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews.' });
  }
});

export default router;
