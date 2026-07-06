import nodemailer from 'nodemailer';

/**
 * Email service — Gmail SMTP via Nodemailer.
 *
 * Why Gmail SMTP: OTP emails must come from a trusted domain to avoid spam
 * folders. Without a custom domain, sending through Gmail's own SMTP servers
 * (from a real @gmail.com address, authenticated with an App Password) gives
 * the best deliverability at zero cost — Gmail passes SPF/DKIM/DMARC for its
 * own domain. Suitable for low-volume transactional email (~500/day limit).
 *
 * Required env vars (set on Railway):
 *   GMAIL_USER         — the Gmail address to send from
 *   GMAIL_APP_PASSWORD — a Google "App Password" (Google Account → Security →
 *                        2-Step Verification → App passwords)
 *
 * If not configured (local dev), OTPs are logged to the console instead so
 * the flow remains fully testable.
 */

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }
  return transporter;
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOtpEmail(to: string, fullName: string, otp: string): Promise<void> {
  const t = getTransporter();

  if (!t) {
    // Dev fallback — no SMTP configured
    console.log(`\n📧 [Email:DEV] OTP for ${to}: ${otp} (expires in 10 minutes)\n`);
    return;
  }

  try {
    await sendViaSmtp(t, to, fullName, otp);
    console.log(`[Email] OTP sent to ${to}`);
  } catch (error: unknown) {
    // Never let a broken SMTP setup take down signup/login. The OTP is already
    // stored in the DB — log it so dev can still complete the flow, and the
    // user can hit "Resend code" once SMTP is fixed.
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Email] SMTP send failed: ${message.split('\n')[0]}`);
    if (message.includes('535') || message.includes('EAUTH')) {
      console.error(
        '[Email] Gmail rejected the credentials. GMAIL_APP_PASSWORD must be a 16-character App Password ' +
        '(Google Account → Security → 2-Step Verification → App passwords), not your normal Gmail password. ' +
        'Remove any spaces from the app password.'
      );
    }
    console.log(`\n📧 [Email:FALLBACK] OTP for ${to}: ${otp} (expires in 10 minutes)\n`);
  }
}

async function sendViaSmtp(
  t: nodemailer.Transporter,
  to: string,
  fullName: string,
  otp: string
): Promise<void> {
  const appName = 'FindMyArtisan';
  await t.sendMail({
    from: `"${appName}" <${process.env.GMAIL_USER}>`,
    to,
    subject: `${otp} is your ${appName} verification code`,
    text: `Hi ${fullName},\n\nYour ${appName} verification code is: ${otp}\n\nIt expires in 10 minutes. If you didn't create an account, you can ignore this email.\n\n— The ${appName} Team`,
    html: `
      <div style="font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; padding: 24px 0;">
          <div style="font-size: 28px; font-weight: 700; color: #d97706;">📍 ${appName}</div>
        </div>
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 32px; text-align: center;">
          <h2 style="margin: 0 0 8px; color: #111827;">Verify your email</h2>
          <p style="color: #6b7280; margin: 0 0 24px;">Hi ${fullName}, use this code to verify your account:</p>
          <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #d97706; background: #fff; border-radius: 8px; padding: 16px; display: inline-block;">${otp}</div>
          <p style="color: #9ca3af; font-size: 13px; margin: 24px 0 0;">This code expires in 10 minutes.<br/>If you didn't create an account, ignore this email.</p>
        </div>
        <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px;">© ${new Date().getFullYear()} ${appName} — Community Service Provider Locator</p>
      </div>
    `,
  });
}
