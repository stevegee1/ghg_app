import React, { useState, useEffect } from 'react';

export interface TypewriterProps {
  phrases: string[];
  typeSpeedMs?: number;
  deleteSpeedMs?: number;
  holdMs?: number;
  loop?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Typewriter: React.FC<TypewriterProps> = ({
  phrases,
  typeSpeedMs = 70,
  deleteSpeedMs = 40,
  holdMs = 2000,
  loop = true,
  className = '',
  style = {},
}) => {
  const firstPhrase = phrases[0] || '';

  // Detect prefers-reduced-motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  const [phraseIndex, setPhraseIndex] = useState<number>(0);
  const [displayedText, setDisplayedText] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    // If prefers-reduced-motion is active, statically display the first phrase with no typing
    if (prefersReducedMotion) {
      setDisplayedText(firstPhrase);
      return;
    }

    if (!phrases || phrases.length === 0) return;

    const currentFullPhrase = phrases[phraseIndex] || '';

    if (!isDeleting && displayedText === currentFullPhrase) {
      // Finished typing current phrase
      if (phrases.length === 1 && !loop) return;

      const holdTimer = setTimeout(() => {
        setIsDeleting(true);
      }, holdMs);
      return () => clearTimeout(holdTimer);
    }

    if (isDeleting && displayedText === '') {
      // Finished deleting current phrase
      setIsDeleting(false);
      const nextIndex = (phraseIndex + 1) % phrases.length;
      if (nextIndex === 0 && !loop) return;
      setPhraseIndex(nextIndex);
      return;
    }

    const speed = isDeleting ? deleteSpeedMs : typeSpeedMs;
    const stepTimer = setTimeout(() => {
      setDisplayedText((prev) =>
        isDeleting
          ? currentFullPhrase.substring(0, prev.length - 1)
          : currentFullPhrase.substring(0, prev.length + 1)
      );
    }, speed);

    return () => clearTimeout(stepTimer);
  }, [displayedText, isDeleting, phraseIndex, phrases, typeSpeedMs, deleteSpeedMs, holdMs, loop, prefersReducedMotion, firstPhrase]);

  if (prefersReducedMotion) {
    return <span className={className} style={style}>{firstPhrase}</span>;
  }

  return (
    <span className={className} style={style}>
      {displayedText}
      <span
        style={{
          display: 'inline-block',
          width: '2px',
          height: '1em',
          backgroundColor: 'currentColor',
          marginLeft: '2px',
          verticalAlign: 'middle',
          animation: 'blink 1s step-end infinite',
        }}
      />
    </span>
  );
};
