import { useEffect, useState } from 'react';

export interface SiteFacts {
  /** Share of each payment that goes to charity partners, e.g. "15"; null if no split is configured */
  charityShare: string | null;
  charityPlacesOpen: number | null;
  charityPlacesTotal: number | null;
}

/** Live facts the marketing pages state, read from the platform so they never go out of date. */
export function useSiteFacts(): SiteFacts {
  const [facts, setFacts] = useState<SiteFacts>({ charityShare: null, charityPlacesOpen: null, charityPlacesTotal: null });
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/public/charity-share').then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch('/api/charities/slots').then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([share, slots]) => {
      if (cancelled) return;
      setFacts({
        charityShare: share?.percent ?? null,
        charityPlacesOpen: typeof slots?.availableSlots === 'number' ? slots.availableSlots : null,
        charityPlacesTotal: typeof slots?.maxCapacity === 'number' ? slots.maxCapacity : null,
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return facts;
}
