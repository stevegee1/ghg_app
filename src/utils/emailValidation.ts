/**
 * Enterprise Work Email Validation Utility
 * Enforces corporate/work email addresses across authentication, registration, and demo booking.
 * Blocks free webmail (Gmail, Yahoo, Hotmail, etc.) and disposable email services.
 */

const BLOCKED_DOMAINS = new Set([
  // Google
  'gmail.com',
  'googlemail.com',

  // Yahoo
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.ca',
  'yahoo.com.au',
  'yahoo.fr',
  'yahoo.de',
  'yahoo.es',
  'yahoo.it',
  'yahoo.in',
  'yahoo.com.br',
  'yahoo.co.jp',
  'ymail.com',
  'rocketmail.com',

  // Microsoft
  'hotmail.com',
  'hotmail.co.uk',
  'hotmail.fr',
  'hotmail.de',
  'hotmail.es',
  'hotmail.it',
  'outlook.com',
  'outlook.co.uk',
  'live.com',
  'live.co.uk',
  'live.fr',
  'msn.com',
  'windowslive.com',

  // Apple
  'icloud.com',
  'me.com',
  'mac.com',

  // AOL
  'aol.com',
  'aim.com',
  'aol.co.uk',

  // Proton
  'protonmail.com',
  'proton.me',
  'pm.me',

  // Zoho
  'zoho.com',
  'zohomail.com',

  // Mail.com & GMX
  'mail.com',
  'email.com',
  'usa.com',
  'gmx.com',
  'gmx.net',
  'gmx.de',
  'gmx.at',
  'gmx.ch',

  // Yandex
  'yandex.com',
  'yandex.ru',
  'ya.ru',

  // Other Free / Consumer Webmail
  'fastmail.com',
  'fastmail.fm',
  'tutanota.com',
  'tutamail.com',
  'tuta.io',
  'hey.com',
  'inbox.com',
  'rediffmail.com',
  'qq.com',
  '163.com',
  '126.com',
  'sina.com',

  // Disposable Email Providers
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  'guerrillamail.com',
  '10minutemail.com',
  'sharklasers.com',
  'throwawaymail.com',
  'getairmail.com',
  'dispostable.com',
  'trashmail.com',
]);

export interface WorkEmailValidationResult {
  isValid: boolean;
  error?: string;
  domain?: string;
}

export const WORK_EMAIL_ERROR_MESSAGE =
  'Please provide an official corporate or organizational work email address (personal providers like Gmail, Yahoo, and Outlook are not permitted).';

/**
 * Validates whether an email string is a legitimate corporate/work email.
 */
export function validateWorkEmail(email: string): WorkEmailValidationResult {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'A valid email address is required.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  const parts = cleanEmail.split('@');

  if (parts.length !== 2) {
    return { isValid: false, error: 'Invalid email address syntax: please enter a valid email address with a single @ symbol.' };
  }

  const [localPart, domain] = parts;

  if (!localPart || localPart.length === 0) {
    return { isValid: false, error: 'Invalid email username: username cannot be empty.' };
  }

  if (!domain || !domain.includes('.')) {
    return { isValid: false, error: 'Invalid email domain: email must contain a valid domain name.' };
  }

  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2) {
    return { isValid: false, error: 'Invalid email domain: domain has an invalid top-level domain.' };
  }

  // Exact match in blocked list
  if (BLOCKED_DOMAINS.has(domain)) {
    return { isValid: false, error: WORK_EMAIL_ERROR_MESSAGE, domain };
  }

  // Subdomain match (e.g. mail.gmail.com or xyz.yahoo.com)
  for (const blocked of BLOCKED_DOMAINS) {
    if (domain.endsWith('.' + blocked)) {
      return { isValid: false, error: WORK_EMAIL_ERROR_MESSAGE, domain };
    }
  }

  // Pattern match for regional variations (e.g., yahoo.*, hotmail.*, etc.)
  if (/^(yahoo|hotmail|outlook|live|proton|gmx)\.[a-z.]+$/i.test(domain)) {
    return { isValid: false, error: WORK_EMAIL_ERROR_MESSAGE, domain };
  }

  return { isValid: true, domain };
}

/**
 * Quick boolean check for corporate email.
 */
export function isWorkEmail(email: string): boolean {
  return validateWorkEmail(email).isValid;
}
