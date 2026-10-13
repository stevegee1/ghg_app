/**
 * Transactional email through Resend (or SendGrid), sent from EMAIL_FROM (info@nftylogslabs.com).
 * Every message has an HTML and a plain-text part. In development without a provider key,
 * messages are logged instead of sent.
 */

export interface SendPasswordResetEmailParams {
  toEmail: string;
  resetUrl: string;
  appName?: string;
  expiresInHours?: number;
}

export interface SendVerificationEmailParams {
  toEmail: string;
  verificationUrl: string;
  appName?: string;
  expiresInHours?: number;
}

const SENDER_NAME = 'NFTYLOGS';
/** Sending address, verified on Resend. EMAIL_FROM may be a bare address or "Name <address>". */
export function senderAddress(): string {
  const configured = (process.env.EMAIL_FROM || 'info@nftylogslabs.com').trim();
  const match = configured.match(/<([^>]+)>/);
  return match ? match[1].trim() : configured;
}

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Plain-text part for an HTML email: links keep their address, tags and entities are removed. */
export function htmlToText(html: string): string {
  return html
    .replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, label: string) => `${label.replace(/<[^>]+>/g, '').trim()}: ${href}`)
    .replace(/<\/(p|h[1-6]|div|li|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_m, code: string) => String.fromCharCode(Number(code)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .filter((line, i, all) => line !== '' || (i > 0 && all[i - 1] !== ''))
    .join('\n')
    .trim();
}

const CARD_STYLE =
  "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;";
const BUTTON_STYLE =
  'background-color: #1a73e8; color: #ffffff; padding: 12px 24px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 6px; display: inline-block;';
const FOOTER_HTML = '<p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">NFTYLOGS Limited. Registered in England and Wales, company no. 15230476.</p>';

export class EmailService {
  private static instance: EmailService;

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /** Password reset link. */
  async sendPasswordResetEmail(params: SendPasswordResetEmailParams): Promise<{ success: boolean; provider: string }> {
    const { toEmail, resetUrl, expiresInHours = 1 } = params;
    const html = `
      <div style="${CARD_STYLE}">
        <h2 style="color: #0f172a; margin: 0 0 12px 0; font-size: 20px;">Reset your password</h2>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
          We received a request to reset the password for the NFTYLOGS account <strong>${escapeHtml(toEmail)}</strong>.
        </p>
        <p style="margin: 24px 0; text-align: center;">
          <a href="${resetUrl}" style="${BUTTON_STYLE}">Reset password</a>
        </p>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
          The link expires in ${expiresInHours} hour${expiresInHours === 1 ? '' : 's'}. If you did not ask for this, ignore this email; your password stays the same.
        </p>
        ${FOOTER_HTML}
      </div>`;
    return this.deliver(toEmail, 'Reset your NFTYLOGS password', html, `Password reset: ${resetUrl}`);
  }

  /** Work email verification link sent at sign-up. */
  async sendVerificationEmail(params: SendVerificationEmailParams): Promise<{ success: boolean; provider: string }> {
    const { toEmail, verificationUrl, expiresInHours = 24 } = params;
    const html = `
      <div style="${CARD_STYLE}">
        <h2 style="color: #0f172a; margin: 0 0 12px 0; font-size: 20px;">Confirm your work email</h2>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
          An NFTYLOGS account was created for <strong>${escapeHtml(toEmail)}</strong>. Confirm the address to finish setting up your account.
        </p>
        <p style="margin: 24px 0; text-align: center;">
          <a href="${verificationUrl}" style="${BUTTON_STYLE}">Confirm email</a>
        </p>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
          The link expires in ${expiresInHours} hours. If you did not create this account, ignore this email.
        </p>
        ${FOOTER_HTML}
      </div>`;
    return this.deliver(toEmail, 'Confirm your NFTYLOGS work email', html, `Verification: ${verificationUrl}`);
  }

  /**
   * Sends one email through the configured provider (Resend, then SendGrid), with a plain-text
   * part generated from the HTML. In development without a provider the message is logged instead.
   */
  private async deliver(
    toEmail: string,
    subject: string,
    html: string,
    logLine: string,
    options: { headers?: Record<string, string>; replyTo?: string } = {}
  ): Promise<{ success: boolean; provider: string }> {
    const address = senderAddress();
    const text = htmlToText(html);
    if (process.env.RESEND_API_KEY) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
          body: JSON.stringify({
            from: `${SENDER_NAME} <${address}>`,
            to: [toEmail],
            subject,
            html,
            text,
            ...(options.replyTo ? { reply_to: options.replyTo } : {}),
            ...(options.headers ? { headers: options.headers } : {}),
          }),
        });
        if (response.ok) return { success: true, provider: 'RESEND' };
        console.error('[EMAIL RESEND ERROR]', await response.text());
      } catch (err) {
        console.error('[EMAIL RESEND EXCEPTION]', err);
      }
    }
    if (process.env.SENDGRID_API_KEY) {
      try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.SENDGRID_API_KEY}` },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: toEmail }] }],
            from: { email: address, name: SENDER_NAME },
            ...(options.replyTo ? { reply_to: { email: options.replyTo } } : {}),
            subject,
            content: [
              { type: 'text/plain', value: text },
              { type: 'text/html', value: html },
            ],
            ...(options.headers ? { headers: options.headers } : {}),
          }),
        });
        if (response.ok || response.status === 202) return { success: true, provider: 'SENDGRID' };
        console.error('[EMAIL SENDGRID ERROR]', response.status);
      } catch (err) {
        console.error('[EMAIL SENDGRID EXCEPTION]', err);
      }
    }
    if (process.env.NODE_ENV === 'production') return { success: false, provider: 'NONE' };
    console.log(`[EMAIL - LOCAL LOG] To: ${toEmail} | ${logLine}`);
    return { success: true, provider: 'LOCAL_LOG' };
  }

  /** Partner applications reach an administrator only after the applicant follows this link. */
  async sendPartnerVerificationEmail(params: { toEmail: string; verifyUrl: string; organisationName: string; programme: string }) {
    const escape = (value: string) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #0f172a; margin: 0 0 12px 0; font-size: 20px;">Confirm your email</h2>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
          We received a ${escape(params.programme)} application from <strong>${escape(params.organisationName)}</strong> with this address.
          Confirm the email to send the application to our team for review.
        </p>
        <p style="margin: 24px 0; text-align: center;">
          <a href="${params.verifyUrl}" style="background-color: #1a73e8; color: #ffffff; padding: 12px 24px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 6px; display: inline-block;">Confirm email</a>
        </p>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
          If you did not apply, ignore this email and the application will not be reviewed. The link expires in 48 hours.
        </p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">NFTYLOGS Limited. Registered in England and Wales, company no. 15230476.</p>
      </div>`;
    return this.deliver(params.toEmail, 'Confirm your NFTYLOGS partner application', html, `Partner verify: ${params.verifyUrl}`);
  }

  /** A client asks a supplier to add their stages of a supply chain (Scope 3). */
  async sendSupplierInviteEmail(params: { toEmail: string; submitUrl: string; clientName: string; chainName: string; expiresOn: string }) {
    const escape = (value: string) => value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #0f172a; margin: 0 0 12px 0; font-size: 20px;">Supply chain emissions request</h2>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
          <strong>${escape(params.clientName)}</strong> asks you to record your stages of <strong>${escape(params.chainName)}</strong>:
          quantities and the emission factors you use, with their source. No account is needed.
        </p>
        <p style="margin: 24px 0; text-align: center;">
          <a href="${params.submitUrl}" style="background-color: #1a73e8; color: #ffffff; padding: 12px 24px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 6px; display: inline-block;">Add supply chain records</a>
        </p>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">The link works until ${escape(params.expiresOn)}. Records cannot be edited once added; corrections are added as new records.</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">NFTYLOGS Limited. Registered in England and Wales, company no. 15230476.</p>
      </div>`;
    return this.deliver(params.toEmail, `Supply chain emissions request from ${params.clientName}`, html, `Supplier invite: ${params.submitUrl}`);
  }

  /** Double opt-in: the subscription only starts when the recipient follows the confirmation link. */
  async sendNewsletterConfirmationEmail(params: { toEmail: string; confirmUrl: string; unsubscribeUrl: string }) {
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #0f172a; margin: 0 0 12px 0; font-size: 20px;">Confirm your subscription</h2>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
          Someone, hopefully you, asked to receive the NFTYLOGS newsletter at <strong>${params.toEmail}</strong>:
          product updates and guidance on emissions, fleet and workforce compliance.
        </p>
        <p style="margin: 24px 0; text-align: center;">
          <a href="${params.confirmUrl}" style="background-color: #1a73e8; color: #ffffff; padding: 12px 24px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 6px; display: inline-block;">Confirm subscription</a>
        </p>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
          If you did not ask for this, ignore this email and you will not be subscribed. The link expires in 7 days.
        </p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
          <a href="${params.unsubscribeUrl}" style="color: #64748b;">Unsubscribe</a> · NFTYLOGS Limited. Registered in England and Wales, company no. 15230476.
        </p>
      </div>`;
    return this.deliver(params.toEmail, 'Confirm your NFTYLOGS newsletter subscription', html, `Newsletter confirm: ${params.confirmUrl}`, {
      headers: { 'List-Unsubscribe': `<${params.unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    });
  }

  /** Tells the team a merch enquiry arrived; replying goes straight to the customer. */
  async sendMerchEnquiryNotification(params: { toEmail: string; itemTitle: string; contactName: string; contactEmail: string; message: string | null; adminUrl: string }) {
    const html = `
      <div style="${CARD_STYLE}">
        <h2 style="color: #0f172a; margin: 0 0 12px 0; font-size: 20px;">New merch enquiry</h2>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
          <strong>${escapeHtml(params.contactName)}</strong> (${escapeHtml(params.contactEmail)}) asked about <strong>${escapeHtml(params.itemTitle)}</strong>.
        </p>
        ${params.message ? `<p style="color: #334155; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(params.message)}</p>` : ''}
        <p style="margin: 24px 0; text-align: center;">
          <a href="${params.adminUrl}" style="${BUTTON_STYLE}">Open merch enquiries</a>
        </p>
        ${FOOTER_HTML}
      </div>`;
    return this.deliver(params.toEmail, `Merch enquiry: ${params.itemTitle}`, html, `Merch enquiry from ${params.contactEmail}`, { replyTo: params.contactEmail });
  }

  /** Confirms to the customer that their merch enquiry reached us. */
  async sendMerchEnquiryAcknowledgement(params: { toEmail: string; contactName: string; itemTitle: string }) {
    const html = `
      <div style="${CARD_STYLE}">
        <h2 style="color: #0f172a; margin: 0 0 12px 0; font-size: 20px;">We received your enquiry</h2>
        <p style="color: #334155; font-size: 15px; line-height: 1.6;">
          Hello ${escapeHtml(params.contactName)}, thank you for asking about <strong>${escapeHtml(params.itemTitle)}</strong>.
          Our team will reply within 1 to 2 business days. You can reply to this email to add anything.
        </p>
        ${FOOTER_HTML}
      </div>`;
    return this.deliver(params.toEmail, `Your NFTYLOGS enquiry: ${params.itemTitle}`, html, `Merch enquiry acknowledgement to ${params.toEmail}`);
  }
}

export const emailService = EmailService.getInstance();
