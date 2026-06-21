/**
 * Dependency-free SVG chart for Forecasts. Renders filled percentile bands, line
 * series (median, comparison scenarios, re-forecast), and point markers (actual
 * Snapshots). Pure + responsive via viewBox — shared by Scenario comparison
 * (E4-S3) and the three-layer tracking chart (E5-S1).
 */
export type Pt = { x: number; y: number };
export type Band = { label: string; color: string; upper: Pt[]; lower: Pt[] };
export type Line = { label: string; color: string; points: Pt[]; dashed?: boolean };
export type Markers = { label: string; color: string; points: Pt[] };

const W = 860;
const PAD = { top: 16, right: 16, bottom: 28, left: 56 };

function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / mag) * mag;
}

function compactUsd(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${Math.round(v / 1e3)}K`;
  return `$${Math.round(v)}`;
}

export function ForecastChart({
  bands = [],
  lines = [],
  markers = [],
  height = 320,
}: {
  bands?: Band[];
  lines?: Line[];
  markers?: Markers[];
  height?: number;
}) {
  const allPts = [
    ...bands.flatMap((b) => [...b.upper, ...b.lower]),
    ...lines.flatMap((l) => l.points),
    ...markers.flatMap((m) => m.points),
  ];
  if (allPts.length === 0) {
    return <div className="text-sm text-faint">No data to chart yet.</div>;
  }

  const xs = allPts.map((p) => p.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const maxY = niceCeil(Math.max(...allPts.map((p) => p.y), 1));

  const innerW = W - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const sx = (x: number) => PAD.left + (maxX === minX ? 0 : ((x - minX) / (maxX - minX)) * innerW);
  const sy = (y: number) => PAD.top + innerH - (y / maxY) * innerH;

  const linePath = (pts: Pt[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");
  const bandPath = (b: Band) => {
    const up = b.upper.map((p) => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`);
    const lo = [...b.lower].reverse().map((p) => `${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`);
    return `M${up.join(" L")} L${lo.join(" L")} Z`;
  };

  // y gridlines (5 ticks), x labels (~6 years).
  const yTicks = Array.from({ length: 5 }, (_, i) => (maxY / 4) * i);
  const yearSpan = maxX - minX;
  const xStep = Math.max(1, Math.round(yearSpan / 6));
  const xTicks: number[] = [];
  for (let yr = minX; yr <= maxX; yr += xStep) xTicks.push(yr);

  const legend = [
    ...bands.map((b) => ({ label: b.label, color: b.color })),
    ...lines.map((l) => ({ label: l.label, color: l.color })),
    ...markers.map((m) => ({ label: m.label, color: m.color })),
  ];

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label="Forecast chart">
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={sy(t)} y2={sy(t)} stroke="#2a2a31" strokeWidth={1} />
            <text x={PAD.left - 8} y={sy(t) + 4} textAnchor="end" fontSize={11} fill="#62626c">
              {compactUsd(t)}
            </text>
          </g>
        ))}
        {xTicks.map((yr) => (
          <text key={yr} x={sx(yr)} y={height - 8} textAnchor="middle" fontSize={11} fill="#62626c">
            {yr}
          </text>
        ))}

        {bands.map((b) => (
          <path key={b.label} d={bandPath(b)} fill={b.color} fillOpacity={0.16} stroke="none" />
        ))}
        {lines.map((l) => (
          <path
            key={l.label}
            d={linePath(l.points)}
            fill="none"
            stroke={l.color}
            strokeWidth={2}
            strokeDasharray={l.dashed ? "5 4" : undefined}
          />
        ))}
        {markers.map((m) =>
          m.points.map((p, i) => (
            <circle key={`${m.label}-${i}`} cx={sx(p.x)} cy={sy(p.y)} r={3.5} fill={m.color} stroke="#0a0a0c" strokeWidth={1} />
          )),
        )}
      </svg>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {legend.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5 text-xs text-muted">
            <span className="inline-block h-2 w-3 rounded-sm" style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
