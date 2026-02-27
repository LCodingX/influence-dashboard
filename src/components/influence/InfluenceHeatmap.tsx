import { useState, useMemo, useCallback } from 'react';
import type { InfluenceMatrix } from '@/lib/types';

interface InfluenceHeatmapProps {
  data: InfluenceMatrix | null;
  onCellClick: (trainIdx: number, evalIdx: number) => void;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  trainLabel: string;
  evalLabel: string;
  score: number;
}

const CELL_SIZE = 40;
const LABEL_WIDTH = 160;
const MAX_LABEL_CHARS = 20;

function truncateLabel(label: string, maxChars: number = MAX_LABEL_CHARS): string {
  if (label.length <= maxChars) return label;
  return label.slice(0, maxChars - 1) + '\u2026';
}

function scoreToColor(score: number, absMax: number): string {
  if (absMax === 0) return 'rgb(255, 255, 255)';

  const normalized = score / absMax;

  if (normalized > 0) {
    // Positive: white -> red
    const intensity = Math.min(1, normalized);
    const r = 255;
    const g = Math.round(255 * (1 - intensity * 0.8));
    const b = Math.round(255 * (1 - intensity * 0.85));
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // Negative: white -> blue
    const intensity = Math.min(1, -normalized);
    const r = Math.round(255 * (1 - intensity * 0.7));
    const g = Math.round(255 * (1 - intensity * 0.55));
    const b = 255;
    return `rgb(${r}, ${g}, ${b})`;
  }
}

export function InfluenceHeatmap({ data, onCellClick }: InfluenceHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    trainLabel: '',
    evalLabel: '',
    score: 0,
  });

  const absMax = useMemo(() => {
    if (!data) return 0;
    let max = 0;
    for (const row of data.scores) {
      for (const val of row) {
        const abs = Math.abs(val);
        if (abs > max) max = abs;
      }
    }
    return max;
  }, [data]);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent, trainIdx: number, evalIdx: number) => {
      if (!data) return;
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setTooltip({
        visible: true,
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
        trainLabel: data.training_labels[trainIdx],
        evalLabel: data.eval_labels[evalIdx],
        score: data.scores[trainIdx][evalIdx],
      });
    },
    [data]
  );

  const handleMouseLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64 bg-navy-800 rounded-lg border border-navy-700">
        <p className="text-slate-400 text-sm">
          No influence data available. Run a training job to compute influence scores.
        </p>
      </div>
    );
  }

  const numRows = data.training_labels.length;
  const numCols = data.eval_labels.length;

  return (
    <div className="relative bg-navy-800 rounded-lg border border-navy-700 p-4">
      <h3 className="text-slate-50 text-sm font-semibold mb-4">
        Influence Heatmap
      </h3>

      <div className="overflow-auto max-h-[600px]">
        {/* Column headers */}
        <div
          className="grid gap-px"
          style={{
            gridTemplateColumns: `${LABEL_WIDTH}px repeat(${numCols}, ${CELL_SIZE}px)`,
          }}
        >
          {/* Top-left empty cell */}
          <div className="h-24" />

          {/* Column labels */}
          {data.eval_labels.map((label, colIdx) => (
            <div
              key={`col-${colIdx}`}
              className="h-24 flex items-end justify-center pb-1"
              title={label}
            >
              <span
                className="text-[10px] text-slate-400 font-mono whitespace-nowrap origin-bottom-left rotate-[-45deg] translate-x-1/2 block max-w-[100px] overflow-hidden text-ellipsis"
              >
                {truncateLabel(label)}
              </span>
            </div>
          ))}

          {/* Rows */}
          {data.training_labels.map((rowLabel, trainIdx) => (
            <div
              key={`row-${trainIdx}`}
              className="contents"
            >
              {/* Row label */}
              <div
                className="flex items-center pr-2 h-[40px]"
                title={rowLabel}
              >
                <span className="text-[11px] text-slate-400 font-mono truncate block w-full text-right">
                  {truncateLabel(rowLabel)}
                </span>
              </div>

              {/* Data cells */}
              {data.scores[trainIdx].map((score, evalIdx) => (
                <button
                  key={`cell-${trainIdx}-${evalIdx}`}
                  className="h-[40px] border border-navy-900/30 transition-all duration-150 hover:ring-2 hover:ring-blue-500 hover:ring-inset hover:z-10 cursor-pointer"
                  style={{ backgroundColor: scoreToColor(score, absMax) }}
                  onClick={() => onCellClick(trainIdx, evalIdx)}
                  onMouseEnter={(e) => handleMouseEnter(e, trainIdx, evalIdx)}
                  onMouseLeave={handleMouseLeave}
                  aria-label={`Training: ${rowLabel}, Eval: ${data.eval_labels[evalIdx]}, Score: ${score.toFixed(4)}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Color scale legend */}
      <div className="mt-4 flex items-center justify-center gap-2">
        <span className="text-[10px] text-slate-400 font-mono">
          -{absMax.toFixed(3)}
        </span>
        <div
          className="h-3 w-48 rounded-sm"
          style={{
            background: `linear-gradient(to right, ${scoreToColor(-absMax, absMax)}, rgb(255, 255, 255), ${scoreToColor(absMax, absMax)})`,
          }}
        />
        <span className="text-[10px] text-slate-400 font-mono">
          +{absMax.toFixed(3)}
        </span>
      </div>
      <div className="flex justify-center mt-1">
        <span className="text-[10px] text-slate-500">
          {numRows} training x {numCols} eval examples
        </span>
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="fixed z-50 px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg shadow-xl pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="text-[11px] text-slate-300 space-y-1">
            <div>
              <span className="text-slate-500">Train: </span>
              <span className="font-mono">{tooltip.trainLabel}</span>
            </div>
            <div>
              <span className="text-slate-500">Eval: </span>
              <span className="font-mono">{tooltip.evalLabel}</span>
            </div>
            <div>
              <span className="text-slate-500">Score: </span>
              <span
                className={`font-mono font-semibold ${
                  tooltip.score > 0
                    ? 'text-rose-400'
                    : tooltip.score < 0
                      ? 'text-blue-400'
                      : 'text-slate-400'
                }`}
              >
                {tooltip.score >= 0 ? '+' : ''}
                {tooltip.score.toFixed(6)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
