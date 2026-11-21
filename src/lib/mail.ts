import "server-only";

/**
 * Optional e-mail sending (password recovery). Configure ONE of:
 *   RESEND_API_KEY + MAIL_FROM     (https://resend.com)
 *   BREVO_API_KEY  + MAIL_FROM     (https://brevo.com — verify one sender address, no domain needed)
 * Without them the site still works: a reset request is flagged for the admin instead.
 */
export function mailConfigured(): boolean {
  return Boolean(process.env.MAIL_FROM && (process.env.RESEND_API_KEY || process.env.BREVO_API_KEY));
}

function parseFrom(from: string): { name?: string; email: string } {
  const m = /^(.*)<(.+)>$/.exec(from.trim());
  return m ? { name: m[1].trim().replace(/^"|"$/g, "") || undefined, email: m[2].trim() } : { email: from.trim() };
}

export async function sendMail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const from = process.env.MAIL_FROM;
  if (!from) return false;
  try {
    if (process.env.RESEND_API_KEY) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [to], subject, html, text }),
        signal: AbortSignal.timeout(10_000),
      });
      return r.ok;
    }
    if (process.env.BREVO_API_KEY) {
      const f = parseFrom(from);
      const r = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json", accept: "application/json" },
        body: JSON.stringify({ sender: f, to: [{ email: to }], subject, htmlContent: html, textContent: text }),
        signal: AbortSignal.timeout(10_000),
      });
      return r.ok;
    }
  } catch (e) {
    console.error("mail failed", e);
  }
  return false;
}
