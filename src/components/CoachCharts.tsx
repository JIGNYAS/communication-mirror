import type { PauseSegment, SeriesPoint } from "@/types/coach";

interface LineChartProps {
  id: string;
  title: string;
  insight: string;
  points: SeriesPoint[];
  duration: number;
  unit: string;
  color?: string;
  startAtZero?: boolean;
  experimental?: boolean;
}

export function LineChart({ id, title, insight, points, duration, unit, color = "#dcae56", startAtZero = false, experimental = false }: LineChartProps) {
  if (!points.length) return <div className="chart-empty"><strong>{title}</strong><p>Not enough timestamped data is available for this chart.</p></div>;
  const width = 760;
  const height = 230;
  const inset = { left: 48, right: 24, top: 26, bottom: 38 };
  const values = points.map((point) => point.value);
  const naturalMin = Math.min(...values);
  const naturalMax = Math.max(...values);
  const minimum = startAtZero ? 0 : Math.max(0, naturalMin - Math.max(4, (naturalMax - naturalMin) * 0.15));
  const maximum = Math.max(minimum + 1, naturalMax + Math.max(4, (naturalMax - naturalMin) * 0.12));
  const x = (time: number) => inset.left + (time / Math.max(1, duration)) * (width - inset.left - inset.right);
  const y = (value: number) => inset.top + (1 - (value - minimum) / (maximum - minimum)) * (height - inset.top - inset.bottom);
  const path = points.map((point) => `${x(point.time).toFixed(1)},${y(point.value).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const ticks = [minimum, (minimum + maximum) / 2, maximum];
  return (
    <figure className="coach-chart" aria-labelledby={`${id}-title`}>
      <figcaption><div><strong id={`${id}-title`}>{title}</strong>{experimental && <span>Experimental estimate</span>}</div><p>{insight}</p></figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${id}-svg-title ${id}-svg-desc`}>
        <title id={`${id}-svg-title`}>{title}</title>
        <desc id={`${id}-svg-desc`}>{insight}. Values range from {Math.round(naturalMin)} to {Math.round(naturalMax)} {unit}.</desc>
        {ticks.map((tick) => <g key={tick}><line x1={inset.left} x2={width - inset.right} y1={y(tick)} y2={y(tick)} className="chart-grid" /><text x={inset.left - 9} y={y(tick) + 4} textAnchor="end">{Math.round(tick)}</text></g>)}
        <line x1={inset.left} x2={width - inset.right} y1={height - inset.bottom} y2={height - inset.bottom} className="chart-axis" />
        <text x={inset.left} y={height - 12}>0:00</text><text x={width - inset.right} y={height - 12} textAnchor="end">{formatTime(duration)}</text>
        <polyline points={path} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(last.time)} cy={y(last.value)} r="5" fill={color} /><text className="chart-direct-label" x={Math.min(width - 88, x(last.time) + 10)} y={Math.max(18, y(last.value) - 10)}>{Math.round(last.value)} {unit}</text>
      </svg>
      <details><summary>Accessible data summary</summary><table><thead><tr><th>Range</th><th>Minimum</th><th>Maximum</th><th>Latest</th></tr></thead><tbody><tr><td>{formatTime(duration)}</td><td>{Math.round(naturalMin)} {unit}</td><td>{Math.round(naturalMax)} {unit}</td><td>{Math.round(last.value)} {unit}</td></tr></tbody></table></details>
    </figure>
  );
}

interface PauseMapProps {
  pauses: PauseSegment[];
  duration: number;
}

export function PauseMap({ pauses, duration }: PauseMapProps) {
  const total = pauses.reduce((sum, pause) => sum + pause.duration, 0);
  return (
    <figure className="pause-map" aria-labelledby="pause-map-title">
      <figcaption><div><strong id="pause-map-title">White-space map</strong><span>Silence longer than 700ms</span></div><p>{pauses.length ? `${pauses.length} deliberate-sized gaps create ${total.toFixed(1)} seconds of visible space.` : "No pauses longer than 700ms were detected."}</p></figcaption>
      <div className="pause-track" role="img" aria-label={`${pauses.length} pauses across ${formatTime(duration)}`}>
        {pauses.map((pause, index) => <span key={`${pause.start}-${index}`} title={`${pause.duration.toFixed(1)}s pause at ${formatTime(pause.start)}`} style={{ left: `${(pause.start / duration) * 100}%`, width: `${Math.max(0.6, (pause.duration / duration) * 100)}%` }} />)}
      </div>
      <div className="pause-axis"><span>0:00</span><span>{formatTime(duration / 2)}</span><span>{formatTime(duration)}</span></div>
      <details><summary>Pause data table</summary>{pauses.length ? <table><thead><tr><th>Pause</th><th>Starts</th><th>Duration</th></tr></thead><tbody>{pauses.map((pause, index) => <tr key={`${pause.start}-row`}><td>{index + 1}</td><td>{formatTime(pause.start)}</td><td>{pause.duration.toFixed(1)}s</td></tr>)}</tbody></table> : <p>No qualifying pauses.</p>}</details>
    </figure>
  );
}

function formatTime(seconds: number): string {
  const rounded = Math.max(0, Math.round(seconds));
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

