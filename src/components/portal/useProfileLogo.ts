import { useEffect, useState } from 'react';

/**
 * Loads the private profile logo with the login token and returns a local URL for <img>, or null
 * when there is no logo. `version` changes after an upload so the new image is fetched.
 */
export function useProfileLogo(token: string | null, logoUrl: string | null | undefined, version = 0): string | null {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!token || !logoUrl) {
      setSrc(null);
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;
    fetch(logoUrl, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (cancelled || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => !cancelled && setSrc(null));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [token, logoUrl, version]);
  return src;
}
