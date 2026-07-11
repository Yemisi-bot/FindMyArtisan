/**
 * Email service — Brevo transactional email API.
 *
 * Why Brevo (not SMTP, not Resend):
 *  - PaaS hosts like Railway block outbound SMTP ports, so Gmail/Nodemailer
 *    connections time out in production. Brevo sends over HTTPS (port 443),
 *    which is never blocked.
 *  - Unlike Resend, Brevo allows sending with only a *verified single sender*
 *    (your own email address) — no custom domain required. Ideal when you don't
 *    own a domain yet. Free tier: 300 emails/day.
 *
 * Required env vars (set on Railway):
 *   BREVO_API_KEY   — from https://app.brevo.com → SMTP & API → API Keys
 *   EMAIL_FROM      — a sender you've VERIFIED in Brevo (Senders, Domains & IPs →
 *                     Senders). Without a verified domain this must be an email
 *                     you confirmed via Brevo's verification link, e.g. your Gmail.
 *   EMAIL_FROM_NAME — display name for the sender (default: "FindMyArtisan").
 *
 * Note: sending "from" a @gmail.com address (rather than your own domain) means
 * some messages may land in recipients' spam. Verifying a domain later removes
 * that limitation.
 *
 * If BREVO_API_KEY is not set (local dev), OTPs are logged to the console
 * instead so the flow stays fully testable without credentials.
 */

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

export function isEmailConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY && process.env.EMAIL_FROM);
}

export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOtpEmail(to: string, fullName: string, otp: string): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.EMAIL_FROM;

  if (!apiKey || !fromEmail) {
    // Dev fallback — email not configured.
    console.log(`\n📧 [Email:DEV] OTP for ${to}: ${otp} (expires in 10 minutes)\n`);
    return;
  }

  const appName = 'FindMyArtisan';
  const fromName = process.env.EMAIL_FROM_NAME || appName;

  try {
    // Bound the request so a slow/unreachable API can never hang the send.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);

    const res = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: to, name: fullName }],
        subject: `${otp} is your ${appName} verification code`,
        textContent: `Hi ${fullName},\n\nYour ${appName} verification code is: ${otp}\n\nIt expires in 10 minutes. If you didn't create an account, you can ignore this email.\n\n— The ${appName} Team`,
        htmlContent: buildHtml(appName, fullName, otp),
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));

    if (!res.ok) {
      // Brevo returns a JSON error body (e.g. sender not verified, bad key).
      const detail = await res.text();
      console.error(`[Email] Brevo rejected the send (${res.status}): ${detail.slice(0, 200)}`);
      if (res.status === 401) {
        console.error('[Email] Check BREVO_API_KEY. Create one at app.brevo.com → SMTP & API → API Keys.');
      }
      if (res.status === 400 && detail.includes('sender')) {
        console.error(`[Email] The sender "${fromEmail}" is not verified in Brevo. Verify it under Senders, Domains & IPs → Senders.`);
      }
      console.log(`\n📧 [Email:FALLBACK] OTP for ${to}: ${otp} (expires in 10 minutes)\n`);
      return;
    }

    console.log(`[Email] OTP sent to ${to}`);
  } catch (err: unknown) {
    // Never let a broken email setup take down signup/login. The OTP is already
    // stored in the DB — log it so the flow can still be completed, and the user
    // can hit "Resend code" once email is fixed.
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Email] Brevo send failed: ${message.split('\n')[0]}`);
    console.log(`\n📧 [Email:FALLBACK] OTP for ${to}: ${otp} (expires in 10 minutes)\n`);
  }
}

function buildHtml(appName: string, fullName: string, otp: string): string {
  return `
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
  `;
}
