/**
 * The three-layer tracking chart (E5-S1, decision 5edebac0): Plan Forecast bands,
 * the actual Snapshot trajectory, and the re-forecast forward bands — overlaid on
 * one ForecastChart.
 */
import { ForecastChart, type Band, type Line, type Markers } from "@/components/forecast-chart";
import type { ForecastBand } from "@/db/schema";

const PLAN_COLOR = "#c0344e";
const REFORECAST_COLOR = "#5b8def";
const ACTUAL_COLOR = "#34c98a";

function bandFrom(bands: ForecastBand[], label: string, color: string): Band {
  return {
    label,
    color,
    upper: bands.map((b) => ({ x: b.year, y: b.p90 })),
    lower: bands.map((b) => ({ x: b.year, y: b.p10 })),
  };
}

export function TrackingChart({
  planForecastBands,
  reforecastBands,
  actualTrajectory,
}: {
  planForecastBands?: ForecastBand[];
  reforecastBands?: ForecastBand[];
  actualTrajectory: { year: number; netWorth: number }[];
}) {
  const bands: Band[] = [];
  const lines: Line[] = [];
  const markers: Markers[] = [];

  if (planForecastBands?.length) {
    bands.push(bandFrom(planForecastBands, "Plan p10–p90", PLAN_COLOR));
    lines.push({
      label: "Plan median",
      color: PLAN_COLOR,
      points: planForecastBands.map((b) => ({ x: b.year, y: b.p50 })),
    });
  }
  if (reforecastBands?.length) {
    bands.push(bandFrom(reforecastBands, "Re-forecast p10–p90", REFORECAST_COLOR));
    lines.push({
      label: "Re-forecast median",
      color: REFORECAST_COLOR,
      dashed: true,
      points: reforecastBands.map((b) => ({ x: b.year, y: b.p50 })),
    });
  }
  if (actualTrajectory.length) {
    const points = actualTrajectory.map((p) => ({ x: p.year, y: p.netWorth }));
    markers.push({ label: "Actual", color: ACTUAL_COLOR, points });
    if (points.length > 1) lines.push({ label: "Actual trajectory", color: ACTUAL_COLOR, points });
  }

  return <ForecastChart bands={bands} lines={lines} markers={markers} height={380} />;
}
