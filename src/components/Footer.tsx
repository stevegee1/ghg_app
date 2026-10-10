import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [consentText, setConsentText] = useState('I agree to receive the NFTYLOGS newsletter by email. I can unsubscribe at any time.');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/newsletter/consent')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.consentText && setConsentText(d.consentText))
      .catch(() => undefined);
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setStatus('error');
      setMessage('Tick the box to agree to receive the newsletter.');
      return;
    }
    setStatus('sending');
    setMessage(null);
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), consent }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'The subscription could not be started. Please try again later.');
      setStatus('sent');
      setMessage(data.message || 'Check your inbox to confirm your subscription.');
    } catch (err) {
      setStatus('error');
      setMessage((err as Error).message);
    }
  };

  return (
    <footer className="cerebrium-footer" role="contentinfo" aria-label="Site Footer">
      <div className="cerebrium-footer-container">
        <div className="cerebrium-footer-top">
          <div className="persefoni-footer-brand-col">
            <Link to="/" className="persefoni-footer-brand" aria-label="NFTYLOGS Home">
              <img src="/images/nfty-logs-logo.png" alt="" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
              <span>NFTYLOGS</span>
            </Link>

            <div className="persefoni-footer-newsletter">
              <h3>Newsletter</h3>
              <p>Product updates and practical guidance on emissions, fleet and workforce compliance. Occasional, never shared.</p>

              {status === 'sent' ? (
                <p className="persefoni-newsletter-success" role="status">
                  {message}
                </p>
              ) : (
                <form className="persefoni-footer-form footer-newsletter-form" onSubmit={handleSubscribe} noValidate>
                  <div className="footer-newsletter-row">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Work email"
                      className="persefoni-footer-input"
                      aria-label="Work email address"
                    />
                    <button type="submit" disabled={status === 'sending'} className="persefoni-footer-btn">
                      <span>{status === 'sending' ? 'Sending...' : 'Subscribe'}</span>
                    </button>
                  </div>
                  <label className="footer-consent">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                    <span>{consentText}</span>
                  </label>
                  {status === 'error' && message && (
                    <p className="footer-newsletter-error" role="alert">
                      {message}
                    </p>
                  )}
                </form>
              )}
            </div>

            {/* Social Media Links */}
            <div className="cerebrium-footer-socials" style={{ marginTop: '0.75rem' }}>
              <a
                href="https://x.com/nftylogs"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (formerly Twitter)"
                className="cerebrium-social-icon"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>

              <a
                href="https://github.com/ghg-emission-logs"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="cerebrium-social-icon"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </a>

              <a
                href="https://discord.gg/nftylogs"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Discord"
                className="cerebrium-social-icon"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </a>

              <a
                href="https://linkedin.com/company/ghg-emission-logs"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="cerebrium-social-icon"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.62 1.62 0 0 0-1.63 1.63 1.63 1.63 0 1 0 3.26 0 1.62 1.62 0 0 0-1.63-1.63z" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <div className="cerebrium-footer-col-title">Solutions</div>
            <ul className="cerebrium-footer-links">
              <li><a href="/#ghg" className="cerebrium-footer-link">GHG &amp; Carbon Emissions</a></li>
              <li><a href="/#fleet" className="cerebrium-footer-link">Fleet Emissions &amp; Telematics</a></li>
              <li><a href="/#workforce" className="cerebrium-footer-link">Social &amp; Workforce</a></li>
              <li><Link to="/merch" className="cerebrium-footer-link">Merch &amp; Custom Merch</Link></li>
            </ul>
          </div>

          <div>
            <div className="cerebrium-footer-col-title">Partners</div>
            <ul className="cerebrium-footer-links">
              <li><Link to="/partners" className="cerebrium-footer-link">Delivery &amp; production partners</Link></li>
              <li><Link to="/partners#charities" className="cerebrium-footer-link">Charity partners</Link></li>
              <li><Link to="/track" className="cerebrium-footer-link">Track a merch order</Link></li>
            </ul>
          </div>

          <div>
            <div className="cerebrium-footer-col-title">Company</div>
            <ul className="cerebrium-footer-links">
              <li><Link to="/transparency" className="cerebrium-footer-link">Transparency &amp; legal</Link></li>
              <li><Link to="/blog" className="cerebrium-footer-link">Blog</Link></li>
              <li>
                <a
                  href="/#contact"
                  className="cerebrium-footer-link"
                  onClick={(e) => {
                    e.preventDefault();
                    window.dispatchEvent(new CustomEvent('open-book-demo-modal'));
                  }}
                >
                  Book a demo
                </a>
              </li>
            </ul>
          </div>

          <div>
            <div className="cerebrium-footer-col-title">Account</div>
            <ul className="cerebrium-footer-links">
              <li><Link to="/create-account" className="cerebrium-footer-link">Create account</Link></li>
              <li><Link to="/portal/login" className="cerebrium-footer-link">Sign in</Link></li>
            </ul>
          </div>
        </div>

        <div className="cerebrium-footer-bottom">
          <div>© {new Date().getFullYear()} NFTYLOGS Limited. Registered in England and Wales, company no. 15230476.</div>
          <div className="footer-legal-links">
            <Link to="/transparency" className="cerebrium-footer-link">Legal</Link>
            <Link to="/transparency" className="cerebrium-footer-link">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
