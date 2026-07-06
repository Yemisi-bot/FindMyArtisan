import { Router, Response } from 'express';
import { query } from '../config/database';
import { authenticate, requireAdmin } from '../middleware/auth';
import { AuthRequest } from '../types';
import { MIN_WORK_IMAGES } from './providers';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// GET /api/admin/stats — Dashboard statistics
router.get('/stats', async (_req: AuthRequest, res: Response) => {
  try {
    const [
      usersCount,
      providersCount,
      suspendedProviders,
      reviewsCount,
      categoriesCount,
      liveProviders,
    ] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users'),
      query('SELECT COUNT(*) as count FROM providers'),
      query('SELECT COUNT(*) as count FROM providers WHERE is_suspended = true'),
      query('SELECT COUNT(*) as count FROM reviews'),
      query('SELECT COUNT(*) as count FROM service_categories'),
      // "Live" = auto-visible: not suspended, email verified, enough work photos
      query(
        `SELECT COUNT(*) as count
         FROM providers p JOIN users u ON p.user_id = u.id
         WHERE p.is_suspended = false AND u.email_verified = true
           AND (SELECT COUNT(*) FROM work_images w WHERE w.provider_id = p.id) >= $1`,
        [MIN_WORK_IMAGES]
      ),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers: parseInt(usersCount.rows[0].count),
        totalProviders: parseInt(providersCount.rows[0].count),
        suspendedProviders: parseInt(suspendedProviders.rows[0].count),
        totalReviews: parseInt(reviewsCount.rows[0].count),
        totalCategories: parseInt(categoriesCount.rows[0].count),
        liveProviders: parseInt(liveProviders.rows[0].count),
      },
    });
  } catch (error) {
    console.error('[Admin] Stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
  }
});

// GET /api/admin/providers — All providers with computed status for moderation
router.get('/providers', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT p.*, sc.name as category_name, sc.icon as category_icon,
              ST_X(p.location::geometry) as longitude, ST_Y(p.location::geometry) as latitude,
              u.full_name as provider_name, u.email as provider_email, u.email_verified,
              (SELECT COUNT(*) FROM work_images w WHERE w.provider_id = p.id)::int as image_count
       FROM providers p
       JOIN service_categories sc ON p.category_id = sc.id
       JOIN users u ON p.user_id = u.id
       ORDER BY p.created_at DESC`
    );

    const rows = result.rows.map((p) => ({
      ...p,
      is_visible:
        !p.is_suspended && p.email_verified && p.image_count >= MIN_WORK_IMAGES,
      images_required: MIN_WORK_IMAGES,
    }));

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[Admin] Providers list error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch providers.' });
  }
});

// GET /api/admin/users — All registered users for the admin directory
router.get('/users', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT u.id, u.full_name, u.email, u.role, u.phone, u.email_verified, u.created_at,
              EXISTS (SELECT 1 FROM providers p WHERE p.user_id = u.id) as has_business
       FROM users u
       ORDER BY u.created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Admin] Users list error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users.' });
  }
});

// PATCH /api/admin/providers/:id/suspend — Suspend / un-suspend a provider
router.patch('/providers/:id/suspend', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { suspended } = req.body;
    const adminId = req.user!.userId;

    const result = await query(
      `UPDATE providers SET is_suspended = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, business_name, is_suspended`,
      [suspended === true, id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Provider not found.' });
      return;
    }

    await query(
      `INSERT INTO admin_logs (admin_id, action, target_type, target_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, suspended ? 'suspend_provider' : 'unsuspend_provider', 'provider', id,
       JSON.stringify({ suspended, providerName: result.rows[0].business_name })]
    );

    res.json({
      success: true,
      message: `Provider ${suspended ? 'suspended' : 'reinstated'} successfully.`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('[Admin] Suspend provider error:', error);
    res.status(500).json({ success: false, message: 'Failed to update suspension status.' });
  }
});

// DELETE /api/admin/reviews/:id — Moderate (delete) a review
router.delete('/reviews/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.user!.userId;

    // Get review details for logging
    const review = await query('SELECT * FROM reviews WHERE id = $1', [id]);
    if (review.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Review not found.' });
      return;
    }

    // Delete the review
    await query('DELETE FROM reviews WHERE id = $1', [id]);

    // Recalculate provider rating
    const { provider_id } = review.rows[0];
    await query(
      `UPDATE providers
       SET average_rating = COALESCE(
         (SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE provider_id = $1), 0
       ),
       review_count = (SELECT COUNT(*) FROM reviews WHERE provider_id = $1)
       WHERE id = $1`,
      [provider_id]
    );

    // Log the action
    await query(
      `INSERT INTO admin_logs (admin_id, action, target_type, target_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, 'delete_review', 'review', id,
       JSON.stringify({ providerId: provider_id, rating: review.rows[0].rating })]
    );

    res.json({ success: true, message: 'Review deleted successfully.' });
  } catch (error) {
    console.error('[Admin] Delete review error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete review.' });
  }
});

// GET /api/admin/providers/:id/details — Full provider dossier for admin review
router.get('/providers/:id/details', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Provider info
    const providerResult = await query(
      `SELECT p.*, sc.name as category_name, sc.icon as category_icon,
              ST_X(p.location::geometry) as longitude, ST_Y(p.location::geometry) as latitude,
              u.full_name as provider_name, u.email as provider_email, u.email_verified, u.phone as user_phone
       FROM providers p
       JOIN service_categories sc ON p.category_id = sc.id
       JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [id]
    );

    if (providerResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Provider not found.' });
      return;
    }

    const provider = providerResult.rows[0];

    // Work images
    const images = await query(
      'SELECT id, image_url, caption, created_at FROM work_images WHERE provider_id = $1 ORDER BY created_at DESC',
      [id]
    );

    // Reviews with reviewer info
    const reviews = await query(
      `SELECT r.id, r.rating, r.comment, r.image_url, r.created_at,
              u.full_name as reviewer_name, u.email as reviewer_email
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.provider_id = $1
       ORDER BY r.created_at DESC`,
      [id]
    );

    // Contact clicks — who revealed this provider's number
    const contacts = await query(
      `SELECT cc.id, cc.created_at,
              u.full_name as user_name, u.email as user_email, u.phone as user_phone
       FROM contact_clicks cc
       JOIN users u ON cc.user_id = u.id
       WHERE cc.provider_id = $1
       ORDER BY cc.created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...provider,
        work_images: images.rows,
        reviews: reviews.rows,
        contacts: contacts.rows,
        image_count: images.rows.length,
        images_required: MIN_WORK_IMAGES,
        is_visible:
          !provider.is_suspended && provider.email_verified && images.rows.length >= MIN_WORK_IMAGES,
      },
    });
  } catch (error) {
    console.error('[Admin] Provider details error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch provider details.' });
  }
});

// GET /api/admin/logs — Audit logs
router.get('/logs', async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 200);
    const result = await query(
      `SELECT al.*, COALESCE(u.full_name, 'System') as admin_name, u.role as actor_role
       FROM admin_logs al
       LEFT JOIN users u ON al.admin_id = u.id
       ORDER BY al.created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('[Admin] Logs error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch logs.' });
  }
});

export default router;
