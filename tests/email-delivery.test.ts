import { emailService, htmlToText, senderAddress } from '../src/services/email.service';

describe('Email delivery', () => {
  const saved = { resend: process.env.RESEND_API_KEY, from: process.env.EMAIL_FROM };
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    process.env.RESEND_API_KEY = 're_test_key';
    fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
  });

  afterEach(() => {
    for (const [key, value] of [['RESEND_API_KEY', saved.resend], ['EMAIL_FROM', saved.from]] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const sentBody = () => JSON.parse(fetchMock.mock.calls[0][1].body as string);

  it('sends from info@nftylogslabs.com by default, with the NFTYLOGS name', async () => {
    delete process.env.EMAIL_FROM;
    expect(senderAddress()).toBe('info@nftylogslabs.com');
    await emailService.sendPasswordResetEmail({ toEmail: 'a@b-example.com', resetUrl: 'https://x.test/reset' });
    expect(sentBody().from).toBe('NFTYLOGS <info@nftylogslabs.com>');
  });

  it('accepts EMAIL_FROM as a bare address or with a display name', () => {
    process.env.EMAIL_FROM = 'info@nftylogslabs.com';
    expect(senderAddress()).toBe('info@nftylogslabs.com');
    process.env.EMAIL_FROM = 'NFTYLOGS Team <info@nftylogslabs.com>';
    expect(senderAddress()).toBe('info@nftylogslabs.com');
  });

  it('includes a plain-text part with every link spelled out', async () => {
    await emailService.sendVerificationEmail({ toEmail: 'a@b-example.com', verificationUrl: 'https://x.test/verify?t=1' });
    const body = sentBody();
    expect(body.html).toContain('https://x.test/verify?t=1');
    expect(body.text).toContain('Confirm email: https://x.test/verify?t=1');
    expect(body.text).not.toMatch(/<[a-z]/i);
  });

  it('adds one-click unsubscribe headers to newsletter email', async () => {
    await emailService.sendNewsletterConfirmationEmail({ toEmail: 'a@b-example.com', confirmUrl: 'https://x.test/c', unsubscribeUrl: 'https://x.test/u?token=abc' });
    expect(sentBody().headers).toEqual({ 'List-Unsubscribe': '<https://x.test/u?token=abc>', 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' });
  });

  it('lets the team reply straight to the customer who sent a merch enquiry', async () => {
    await emailService.sendMerchEnquiryNotification({
      toEmail: 'team@nftylogslabs.com',
      itemTitle: 'Team <T-shirt>',
      contactName: 'Sam',
      contactEmail: 'sam@club-example.org',
      message: null,
      adminUrl: 'https://x.test/admin?tab=MERCH_ENQUIRIES',
    });
    const body = sentBody();
    expect(body.reply_to).toBe('sam@club-example.org');
    expect(body.html).not.toContain('<T-shirt>');
  });

  it('turns HTML into readable text', () => {
    expect(htmlToText('<p>Hello <strong>you</strong> &amp; co</p><p><a href="https://x.test">Open</a></p>')).toBe('Hello you & co\nOpen: https://x.test');
  });
});
