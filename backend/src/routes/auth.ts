import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';
import { authenticate } from '../middleware/auth';
import { AuthRequest, RegisterDto, LoginDto, User } from '../types';
import { generateOtp, sendOtpEmail } from '../services/email';
import { logActivity } from '../services/activity';

const router = Router();
const OTP_TTL_MINUTES = 10;

async function issueOtp(userId: string, email: string, fullName: string): Promise<void> {
  const otp = generateOtp();
  await query(
    `UPDATE users SET otp_code = $1, otp_expires_at = NOW() + INTERVAL '${OTP_TTL_MINUTES} minutes' WHERE id = $2`,
    [otp, userId]
  );
  await sendOtpEmail(email, fullName, otp);
}
function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'fallback_secret';
}
function getJwtExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN || '24h';
}

function generateToken(user: User): string {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    getJwtSecret(),
    { expiresIn: getJwtExpiresIn() } as jwt.SignOptions
  );
}

// POST /api/auth/register
router.post('/register', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, fullName, phone, role = 'user' }: RegisterDto = req.body;

    // Validation
    if (!email || !password || !fullName) {
      res.status(400).json({
        success: false,
        message: 'Email, password, and full name are required.',
      });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      });
      return;
    }

    // Check for existing user
    const existing = await query(
      'SELECT id, email, full_name, email_verified FROM users WHERE email = $1',
      [email]
    );
    if (existing.rows.length > 0) {
      const existingUser = existing.rows[0];

      // Account exists but was never verified (e.g. the OTP email failed the
      // first time) — send a fresh code and route them to verification.
      if (!existingUser.email_verified) {
        await issueOtp(existingUser.id, existingUser.email, existingUser.full_name);
        res.status(200).json({
          success: true,
          message: 'This email is already registered but not verified. We sent you a new code.',
          data: { needsVerification: true, email: existingUser.email },
        });
        return;
      }

      res.status(409).json({
        success: false,
        message: 'An account with this email already exists. Please sign in instead.',
      });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const result = await query(
      `INSERT INTO users (email, password_hash, full_name, role, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, full_name, role, phone, created_at`,
      [email, passwordHash, fullName, role, phone || null]
    );

    const user = result.rows[0];

    logActivity(user.id, 'user_registered', 'user', user.id, {
      fullName: user.full_name,
      role: user.role,
    });

    // Email verification: send a one-time code — no token until verified
    await issueOtp(user.id, user.email, user.full_name);

    res.status(201).json({
      success: true,
      message: 'Account created. We sent a verification code to your email.',
      data: {
        needsVerification: true,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('[Auth] Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password }: LoginDto = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
      return;
    }

    // Find user
    const result = await query(
      'SELECT id, email, password_hash, full_name, role, phone, email_verified, created_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
      return;
    }

    const user = result.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
      return;
    }

    // Block unverified accounts — resend a fresh OTP so they can verify now
    if (!user.email_verified) {
      await issueOtp(user.id, user.email, user.full_name);
      res.status(403).json({
        success: false,
        message: 'Please verify your email. We just sent you a new code.',
        data: { needsVerification: true, email: user.email },
      });
      return;
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      passwordHash: user.password_hash,
      fullName: user.full_name,
      role: user.role,
      phone: user.phone,
      createdAt: user.created_at,
      updatedAt: user.updated_at || user.created_at,
    });

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          phone: user.phone,
        },
      },
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
    });
  }
});

// POST /api/auth/verify-otp — Verify email with the one-time code
router.post('/verify-otp', async (req: AuthRequest, res: Response) => {
  try {
    const { email, otp } = req.body as { email?: string; otp?: string };

    if (!email || !otp) {
      res.status(400).json({ success: false, message: 'Email and code are required.' });
      return;
    }

    const result = await query(
      `SELECT id, email, full_name, role, phone, email_verified, otp_code, otp_expires_at, created_at
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Account not found.' });
      return;
    }

    const user = result.rows[0];

    if (user.email_verified) {
      res.status(400).json({ success: false, message: 'Email is already verified. Please log in.' });
      return;
    }

    if (!user.otp_code || user.otp_code !== String(otp).trim()) {
      res.status(400).json({ success: false, message: 'Invalid verification code.' });
      return;
    }

    if (!user.otp_expires_at || new Date(user.otp_expires_at) < new Date()) {
      res.status(400).json({ success: false, message: 'Code has expired. Please request a new one.' });
      return;
    }

    await query(
      'UPDATE users SET email_verified = true, otp_code = NULL, otp_expires_at = NULL WHERE id = $1',
      [user.id]
    );

    logActivity(user.id, 'email_verified', 'user', user.id, { fullName: user.full_name });

    const token = generateToken({
      id: user.id,
      email: user.email,
      passwordHash: '',
      fullName: user.full_name,
      role: user.role,
      phone: user.phone,
      createdAt: user.created_at,
      updatedAt: user.created_at,
    });

    res.json({
      success: true,
      message: 'Email verified successfully.',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          phone: user.phone,
        },
      },
    });
  } catch (error) {
    console.error('[Auth] OTP verification error:', error);
    res.status(500).json({ success: false, message: 'Verification failed. Please try again.' });
  }
});

// POST /api/auth/resend-otp — Send a fresh verification code
router.post('/resend-otp', async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body as { email?: string };

    if (!email) {
      res.status(400).json({ success: false, message: 'Email is required.' });
      return;
    }

    const result = await query(
      'SELECT id, email, full_name, email_verified FROM users WHERE email = $1',
      [email]
    );

    // Do not reveal whether the account exists
    if (result.rows.length === 0 || result.rows[0].email_verified) {
      res.json({ success: true, message: 'If that account needs verification, a new code has been sent.' });
      return;
    }

    const user = result.rows[0];
    await issueOtp(user.id, user.email, user.full_name);

    res.json({ success: true, message: 'A new verification code has been sent to your email.' });
  } catch (error) {
    console.error('[Auth] Resend OTP error:', error);
    res.status(500).json({ success: false, message: 'Failed to resend code. Please try again.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      'SELECT id, email, full_name, role, phone, created_at FROM users WHERE id = $1',
      [req.user!.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }

    const user = result.rows[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        phone: user.phone,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('[Auth] Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile.',
    });
  }
});

export default router;
