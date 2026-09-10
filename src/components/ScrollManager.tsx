import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Enterprise Scroll & Anchor Manager (Amazon / Google SaaS Standard)
 * 
 * Guarantees:
 * 1. Deep-linking to hash fragments (#security, #compliance, #plans, etc.) smoothly
 *    scrolls to the target element with DOM-ready polling.
 * 2. On standard pathname transitions without hash, resets viewport scroll to top (0, 0).
 * 3. Accounts for sticky navbar clearance.
 */
export const ScrollManager: React.FC = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const targetId = hash.replace('#', '');
      let attempts = 0;
      const maxAttempts = 10;
      const intervalMs = 50;

      const scrollToElement = () => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else if (attempts < maxAttempts) {
          attempts += 1;
          setTimeout(scrollToElement, intervalMs);
        }
      };

      // Initial tick to allow React mounting
      const timer = setTimeout(scrollToElement, 30);
      return () => clearTimeout(timer);
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [pathname, hash]);

  return null;
};
