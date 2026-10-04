import React, { useEffect, useRef, useState } from 'react';
import { formatMonth, formatTonnes } from './fleetFormat';

interface MonthPoint {
  month: string;
  kgCo2e: string;
}

interface Props {
  data: MonthPoint[];
}

const HEIGHT = 220;
const MARGIN = { top: 20, right: 8, bottom: 28, left: 44 };
const MAX_COLUMN = 24;
const RADIUS = 4;

function niceStep(max: number): number {
  const rough = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / magnitude;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * magnitude;
}

/** Column path with a rounded data end and a square baseline. */
function columnPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(RADIUS, w / 2, h);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

export const FleetMonthlyChart: React.FC<Props> = ({ data }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const tonnes = data.map((d) => Number(d.kgCo2e) / 1000);
  const maxValue = Math.max(...tonnes, 0);
  const step = maxValue > 0 ? niceStep(maxValue) : 1;
  const top = Math.max(step * Math.ceil(maxValue / step), step);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const plotW = Math.max(width - MARGIN.left - MARGIN.right, 0);
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const band = data.length > 0 ? plotW / data.length : 0;
  const colW = Math.min(MAX_COLUMN, band * 0.6);
  const labelEvery = band < 36 ? Math.ceil(36 / Math.max(band, 1)) : 1;
  const maxIndex = tonnes.indexOf(maxValue);
  const yFor = (v: number) => MARGIN.top + plotH - (v / top) * plotH;

  return (
    <div className="fleet-chart" ref={wrapRef}>
      {width > 0 && (
        <svg width={width} height={HEIGHT} role="img" aria-label="Monthly emissions in tonnes CO2e">
          {ticks.map((t) => (
            <g key={t}>
              <line className="fleet-chart-grid" x1={MARGIN.left} x2={width - MARGIN.right} y1={yFor(t)} y2={yFor(t)} />
              <text className="fleet-chart-axis" x={MARGIN.left - 6} y={yFor(t)} dy="0.32em" textAnchor="end">
                {t.toLocaleString('en-GB', { maximumFractionDigits: 1 })}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const v = tonnes[i];
            const h = (v / top) * plotH;
            const x = MARGIN.left + band * i + (band - colW) / 2;
            const y = MARGIN.top + plotH - h;
            return (
              <g
                key={d.month}
                tabIndex={0}
                className="fleet-chart-column"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                aria-label={`${formatMonth(d.month)}: ${formatTonnes(d.kgCo2e)} tonnes CO2e`}
              >
                <rect className="fleet-chart-hit" x={MARGIN.left + band * i} y={MARGIN.top} width={band} height={plotH} />
                {h > 0 && <path className={`fleet-chart-bar${active === i ? ' is-active' : ''}`} d={columnPath(x, y, colW, h)} />}
                {i === maxIndex && maxValue > 0 && (
                  <text className="fleet-chart-value" x={x + colW / 2} y={y - 6} textAnchor="middle">
                    {formatTonnes(d.kgCo2e)}
                  </text>
                )}
                {i % labelEvery === 0 && (
                  <text className="fleet-chart-axis" x={MARGIN.left + band * i + band / 2} y={HEIGHT - 8} textAnchor="middle">
                    {formatMonth(d.month)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {active !== null && width > 0 && (
        <div
          className="fleet-chart-tooltip"
          style={{ left: Math.min(MARGIN.left + band * active + band / 2, width - 80), top: yFor(tonnes[active]) - 8 }}
          role="status"
        >
          <strong>{formatMonth(data[active].month)}</strong>
          <span>{formatTonnes(data[active].kgCo2e)} t CO2e</span>
        </div>
      )}
    </div>
  );
};
