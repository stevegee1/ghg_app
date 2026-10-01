import React from 'react';

interface CerebriumAnimatedHeroBackgroundProps {
  children?: React.ReactNode;
  showRadarNode?: boolean; // kept for API compat, no longer renders a node
}

export const CerebriumAnimatedHeroBackground: React.FC<CerebriumAnimatedHeroBackgroundProps> = ({
  children,
}) => {

  return (
    <div className="cerebrium-hero-wrapper">
      {/* 1. Ambient Cosmic Violet/Magenta Glow Aura */}
      <div className="cerebrium-ambient-aura" />

      {/* 2. Coordinate Dot Matrix */}
      <div className="cerebrium-grid-dots" />

      {/* 3. 3D Sweeping Plum Ribbons with Traveling Neon Laser */}
      <div className="cerebrium-ribbon-stage">
        <svg
          viewBox="0 0 1440 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            {/* Ribbon 1: Luminous Sky to Indigo Enterprise Gradient */}
            <linearGradient id="plumGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.85" />
              <stop offset="35%" stopColor="#bae6fd" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#c7d2fe" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#e0e7ff" stopOpacity="0.7" />
            </linearGradient>

            {/* Ribbon 2: Luminous Mint to Azure Arc */}
            <linearGradient id="plumGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f0fdf4" stopOpacity="0.9" />
              <stop offset="45%" stopColor="#bbf7d0" stopOpacity="0.85" />
              <stop offset="85%" stopColor="#bfdbfe" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.75" />
            </linearGradient>

            {/* Traveling Laser Light Streak (Pure Azure to Emerald Accent) */}
            <linearGradient id="laserBeamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(14, 165, 233, 0)" />
              <stop offset="40%" stopColor="rgba(14, 165, 233, 0.85)" />
              <stop offset="50%" stopColor="#0284c7" />
              <stop offset="60%" stopColor="rgba(16, 185, 129, 0.85)" />
              <stop offset="100%" stopColor="rgba(16, 185, 129, 0)" />
            </linearGradient>

            <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="18" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 3D Ribbon Ribbon 1 (Outer Major Arc) */}
          <path
            d="M 650 950 C 780 720 920 480 1200 360 C 1360 290 1480 340 1520 380"
            stroke="url(#plumGrad1)"
            strokeWidth="110"
            strokeLinecap="round"
            fill="none"
            opacity="0.9"
          />

          {/* 3D Ribbon Ribbon 2 (Middle Arc) */}
          <path
            d="M 520 950 C 660 680 820 420 1140 310 C 1300 250 1440 300 1490 350"
            stroke="url(#plumGrad2)"
            strokeWidth="85"
            strokeLinecap="round"
            fill="none"
            opacity="0.95"
          />

          {/* 3D Ribbon Ribbon 3 (Inner Sculptural Band) */}
          <path
            d="M 380 950 C 540 640 720 370 1060 260 C 1220 210 1380 270 1440 320"
            stroke="url(#plumGrad1)"
            strokeWidth="65"
            strokeLinecap="round"
            fill="none"
            opacity="0.85"
          />

          {/* Kinetic Neon Laser Beam 1 (Traveling along Ribbon 2) */}
          <path
            d="M 520 950 C 660 680 820 420 1140 310 C 1300 250 1440 300 1490 350"
            stroke="url(#laserBeamGrad)"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
            filter="url(#neonGlow)"
            strokeDasharray="220 1000"
            style={{
              animation: 'laserTravel 4.2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
            }}
          />

          {/* Kinetic Neon Laser Beam 2 (Traveling along Ribbon 3 with offset) */}
          <path
            d="M 380 950 C 540 640 720 370 1060 260 C 1220 210 1380 270 1440 320"
            stroke="url(#laserBeamGrad)"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
            filter="url(#neonGlow)"
            strokeDasharray="180 950"
            style={{
              animation: 'laserTravel 5.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
              animationDelay: '1.8s',
            }}
          />
        </svg>
      </div>


      {/* Content Slot */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%' }}>
        {children}
      </div>
    </div>
  );
};
