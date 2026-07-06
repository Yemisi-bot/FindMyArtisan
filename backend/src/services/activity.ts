import { query } from '../config/database';

/**
 * Central activity/audit logger. Records notable platform events into the
 * admin_logs table so the admin "Activity Logs" view reflects what's actually
 * happening — signups, new businesses, reviews, verifications, and admin
 * moderation. Logging is best-effort and never blocks the main request.
 *
 * @param actorId  The user who caused the event (or null for system events).
 * @param action   Machine-readable event key, e.g. 'user_registered'.
 * @param targetType  What the event is about: 'user' | 'provider' | 'review'.
 * @param targetId    The affected row's id (required by the schema).
 * @param metadata    Extra context rendered in the UI (names, ratings, etc.).
 */
export async function logActivity(
  actorId: string | null,
  action: string,
  targetType: string,
  targetId: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    await query(
      `INSERT INTO admin_logs (admin_id, action, target_type, target_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [actorId, action, targetType, targetId, JSON.stringify(metadata)]
    );
  } catch (error) {
    // Never let logging break the actual operation.
    console.error('[Activity] Failed to log event:', (error as Error).message);
  }
}
