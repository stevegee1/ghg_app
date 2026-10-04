import React, { useEffect, useRef, useState } from 'react';

/**
 * A hand-built animated diagram of the platform: data flows in from sites, machines and workforce
 * records, is calculated and reviewed at the centre, and comes out as reports and credentials;
 * merch goes to local delivery partners and a share of payments goes to charity partners.
 * It steps through five stages with a caption. With reduced motion it is static and click-driven.
 */

type FlowId = 'inGhg' | 'inFleet' | 'inWorkforce' | 'ghgHub' | 'fleetHub' | 'workforceHub' | 'hubOut' | 'merchOut' | 'merchHub' | 'hubCharity';

const FLOWS: Record<FlowId, { d: string; tone: string }> = {
  inGhg: { d: 'M100 66 L122 104', tone: 'ghg' },
  inFleet: { d: 'M500 66 L478 104', tone: 'fleet' },
  inWorkforce: { d: 'M100 414 L122 376', tone: 'workforce' },
  ghgHub: { d: 'M196 150 C232 162 248 176 254 196', tone: 'ghg' },
  fleetHub: { d: 'M404 150 C368 162 352 176 346 196', tone: 'fleet' },
  workforceHub: { d: 'M196 330 C232 318 248 304 254 284', tone: 'workforce' },
  hubOut: { d: 'M300 172 L300 66', tone: 'hub' },
  merchOut: { d: 'M478 376 L500 414', tone: 'merch' },
  merchHub: { d: 'M404 330 C368 318 352 304 346 284', tone: 'merch' },
  hubCharity: { d: 'M300 308 L300 414', tone: 'charity' },
};

const STAGES: { label: string; caption: string; flows: FlowId[]; nodes: string[] }[] = [
  {
    label: 'Data in',
    caption: 'Your data flows in: energy bills, machine telemetry and workforce records.',
    flows: ['inGhg', 'inFleet', 'inWorkforce'],
    nodes: ['sites', 'machines', 'records', 'ghg', 'fleet', 'workforce'],
  },
  {
    label: 'Review',
    caption: 'Emissions are calculated from real consumption and a Lead Auditor reviews the evidence.',
    flows: ['ghgHub', 'fleetHub', 'workforceHub'],
    nodes: ['ghg', 'fleet', 'workforce', 'hub'],
  },
  {
    label: 'Results',
    caption: 'You get reports, downloads and credentials anyone can verify.',
    flows: ['hubOut'],
    nodes: ['hub', 'reports'],
  },
  {
    label: 'Merch',
    caption: 'Merch delivery is arranged with partners as close to your customers as possible.',
    flows: ['merchOut'],
    nodes: ['merch', 'delivery'],
  },
  {
    label: 'Charity',
    caption: 'A share of every payment goes to our charity partners.',
    flows: ['merchHub', 'hubCharity'],
    nodes: ['merch', 'hub', 'charity'],
  },
];

/** The hub in the middle of the diagram. */
const HUB = { cx: 300, cy: 240, r: 76 };

/** Where the round brand mark sits inside its 836 x 662 image: centre and radius, in image pixels. */
const LOGO = { width: 836, height: 662, circleCx: 404, circleCy: 325, circleR: 296 };
const LOGO_SCALE = HUB.r / LOGO.circleR;

const STAGE_MS = 3800;
const RESUME_AFTER_MS = 12000;

interface NodeSpec {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sub?: string;
  tone: string;
  kind: 'service' | 'source';
}

const NODES: NodeSpec[] = [
  { id: 'sites', x: 100, y: 46, w: 150, h: 40, label: 'Sites & energy bills', tone: 'ghg', kind: 'source' },
  { id: 'machines', x: 500, y: 46, w: 150, h: 40, label: 'Machines & vehicles', tone: 'fleet', kind: 'source' },
  { id: 'records', x: 100, y: 434, w: 150, h: 40, label: 'Workforce records', tone: 'workforce', kind: 'source' },
  { id: 'delivery', x: 500, y: 434, w: 150, h: 40, label: 'Local delivery', tone: 'merch', kind: 'source' },
  { id: 'reports', x: 300, y: 46, w: 170, h: 40, label: 'Reports & credentials', tone: 'hub', kind: 'source' },
  { id: 'charity', x: 300, y: 434, w: 150, h: 40, label: 'Charity partners', tone: 'charity', kind: 'source' },
  { id: 'ghg', x: 140, y: 130, w: 150, h: 54, label: 'GHG & Carbon', sub: 'Scope 1-3', tone: 'ghg', kind: 'service' },
  { id: 'fleet', x: 460, y: 130, w: 150, h: 54, label: 'Fleet', sub: 'Telematics', tone: 'fleet', kind: 'service' },
  { id: 'workforce', x: 140, y: 350, w: 150, h: 54, label: 'Workforce', sub: 'Social value', tone: 'workforce', kind: 'service' },
  { id: 'merch', x: 460, y: 350, w: 150, h: 54, label: 'Merch', sub: 'Custom & printed', tone: 'merch', kind: 'service' },
];

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
  );
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

export const EcosystemAnimation: React.FC = () => {
  const reducedMotion = usePrefersReducedMotion();
  const [stage, setStage] = useState(0);
  const [userChose, setUserChose] = useState(false);
  const pausedUntil = useRef(0);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = setInterval(() => {
      if (document.hidden || Date.now() < pausedUntil.current) return;
      setStage((s) => (s + 1) % STAGES.length);
    }, STAGE_MS);
    return () => clearInterval(timer);
  }, [reducedMotion]);

  const choose = (index: number) => {
    pausedUntil.current = Date.now() + RESUME_AFTER_MS;
    setUserChose(true);
    setStage(index);
  };

  const current = STAGES[stage];
  const activeFlows = new Set(current.flows);
  const activeNodes = new Set(current.nodes);

  return (
    <figure className="eco" aria-labelledby="eco-caption">
      <svg className={`eco-svg${reducedMotion ? ' is-static' : ''}`} viewBox="0 0 600 480" role="img" aria-labelledby="eco-title eco-desc">
        <title id="eco-title">How GHGEmissionLogs works</title>
        <desc id="eco-desc">
          Energy bills, machine data and workforce records flow into the GHG, Fleet and Workforce services. The platform calculates
          emissions, a Lead Auditor reviews the evidence, and reports and credentials come out. Merch orders go to local delivery
          partners, and a share of every payment goes to charity partners.
        </desc>

        {(Object.keys(FLOWS) as FlowId[]).map((id) => {
          const flow = FLOWS[id];
          const active = activeFlows.has(id);
          return (
            <g key={id} className={`eco-flow tone-${flow.tone}${active ? ' is-active' : ''}`}>
              <path id={`eco-path-${id}`} d={flow.d} className="eco-line" />
              {!reducedMotion && active &&
                [0, 0.9].map((delay) => (
                  <circle key={delay} r="5" className="eco-particle">
                    <animateMotion dur="1.8s" begin={`${delay}s`} repeatCount="indefinite" rotate="auto">
                      <mpath href={`#eco-path-${id}`} />
                    </animateMotion>
                  </circle>
                ))}
            </g>
          );
        })}

        <g className={`eco-hub${activeNodes.has('hub') ? ' is-active' : ''}`}>
          <defs>
            <clipPath id="eco-hub-clip">
              <circle cx={HUB.cx} cy={HUB.cy} r={HUB.r} />
            </clipPath>
          </defs>
          {!reducedMotion && <circle cx={HUB.cx} cy={HUB.cy} r={HUB.r + 4} className="eco-hub-pulse" />}
          <circle cx={HUB.cx} cy={HUB.cy} r={HUB.r} className="eco-hub-core" />
          {/* The brand mark is itself a circle; it is scaled so that circle fills the hub exactly. */}
          <image
            href="/images/nfty-logs-logo.png"
            x={HUB.cx - LOGO.circleCx * LOGO_SCALE}
            y={HUB.cy - LOGO.circleCy * LOGO_SCALE}
            width={LOGO.width * LOGO_SCALE}
            height={LOGO.height * LOGO_SCALE}
            clipPath="url(#eco-hub-clip)"
            preserveAspectRatio="xMidYMid meet"
          />
          <circle cx={HUB.cx} cy={HUB.cy} r={HUB.r} className="eco-hub-ring" />
        </g>

        {NODES.map((n) => (
          <g key={n.id} className={`eco-node kind-${n.kind} tone-${n.tone}${activeNodes.has(n.id) ? ' is-active' : ''}`}>
            <rect x={n.x - n.w / 2} y={n.y - n.h / 2} width={n.w} height={n.h} rx={n.kind === 'service' ? 12 : 20} />
            {n.kind === 'service' && <rect x={n.x - n.w / 2} y={n.y - n.h / 2} width="6" height={n.h} rx="3" className="eco-node-bar" />}
            <text x={n.x} y={n.sub ? n.y - 3 : n.y + 5} textAnchor="middle" className="eco-node-label">
              {n.label}
            </text>
            {n.sub && (
              <text x={n.x} y={n.y + 16} textAnchor="middle" className="eco-node-sub">
                {n.sub}
              </text>
            )}
          </g>
        ))}
      </svg>

      <figcaption className="eco-caption">
        <ol className="eco-stages" aria-label="Stages">
          {STAGES.map((s, i) => (
            <li key={s.label}>
              <button type="button" className={i === stage ? 'is-current' : ''} aria-current={i === stage ? 'step' : undefined} onClick={() => choose(i)}>
                <span className="eco-stage-number">{i + 1}</span>
                {s.label}
              </button>
            </li>
          ))}
        </ol>
        {/* Only announce changes the visitor made, not the automatic rotation. */}
        <p id="eco-caption" aria-live={userChose ? 'polite' : 'off'}>
          {current.caption}
        </p>
      </figcaption>
    </figure>
  );
};
