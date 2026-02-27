import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import type { InfluenceMatrix } from '@/lib/types';

interface InfluenceSummaryProps {
  data: InfluenceMatrix | null;
}

interface AvgInfluenceEntry {
  name: string;
  fullName: string;
  value: number;
}

interface HistogramBin {
  range: string;
  count: number;
  isPositive: boolean;
}

const MAX_LABEL_LEN = 12;

function truncate(str: string, max: number = MAX_LABEL_LEN): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + '\u2026';
}

export function InfluenceSummary({ data }: InfluenceSummaryProps) {
  const stats = useMemo(() => {
    if (!data || !Array.isArray(data.scores) || data.scores.length === 0) return null;
    if (!Array.isArray(data.training_labels) || !Array.isArray(data.eval_labels)) return null;

    const numRows = data.scores.length;
    const numCols = data.scores[0].length;

    // Find most and least influential training example (by absolute score sum)
    let maxAbsSum = -Infinity;
    let minAbsSum = Infinity;
    let maxIdx = 0;
    let minIdx = 0;

    for (let i = 0; i < numRows; i++) {
      const absSum = data.scores[i].reduce((acc, v) => acc + Math.abs(v), 0);
      if (absSum > maxAbsSum) {
        maxAbsSum = absSum;
        maxIdx = i;
      }
      if (absSum < minAbsSum) {
        minAbsSum = absSum;
        minIdx = i;
      }
    }

    // Average influence per eval question
    const avgPerEval: AvgInfluenceEntry[] = [];
    for (let j = 0; j < numCols; j++) {
      let sum = 0;
      for (let i = 0; i < numRows; i++) {
        sum += data.scores[i][j];
      }
      avgPerEval.push({
        name: truncate(data.eval_labels[j]),
        fullName: data.eval_labels[j],
        value: Number((sum / numRows).toFixed(6)),
      });
    }

    // Histogram of all scores
    const allScores: number[] = [];
    for (const row of data.scores) {
      for (const val of row) {
        allScores.push(val);
      }
    }

    const absMax = Math.max(...allScores.map(Math.abs), 0.001);
    const numBins = 20;
    const binWidth = (2 * absMax) / numBins;
    const bins: HistogramBin[] = [];

    for (let b = 0; b < numBins; b++) {
      const low = -absMax + b * binWidth;
      const high = low + binWidth;
      const count = allScores.filter((s) => s >= low && (b === numBins - 1 ? s <= high : s < high)).length;
      bins.push({
        range: `${low.toFixed(3)}`,
        count,
        isPositive: low + binWidth / 2 >= 0,
      });
    }

    return {
      mostInfluential: {
        index: maxIdx,
        label: data.training_labels[maxIdx],
        absSum: maxAbsSum,
      },
      leastInfluential: {
        index: minIdx,
        label: data.training_labels[minIdx],
        absSum: minAbsSum,
      },
      avgPerEval,
      histogram: bins,
      totalScores: allScores.length,
    };
  }, [data]);

  if (!data || !stats) {
    return (
      <div className="flex items-center justify-center h-48 bg-navy-800 rounded-lg border border-navy-700">
        <p className="text-slate-400 text-sm">
          No influence data to summarize.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Most influential */}
        <div className="bg-navy-800 rounded-lg border border-navy-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-rose-400" />
            <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">
              Most Influential
            </span>
          </div>
          <p className="text-sm text-slate-200 font-mono truncate" title={stats.mostInfluential.label}>
            {stats.mostInfluential.label}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Training example #{stats.mostInfluential.index + 1} &middot;
            abs. sum: {stats.mostInfluential.absSum.toFixed(4)}
          </p>
        </div>

        {/* Least influential */}
        <div className="bg-navy-800 rounded-lg border border-navy-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={14} className="text-blue-400" />
            <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">
              Least Influential
            </span>
          </div>
          <p className="text-sm text-slate-200 font-mono truncate" title={stats.leastInfluential.label}>
            {stats.leastInfluential.label}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Training example #{stats.leastInfluential.index + 1} &middot;
            abs. sum: {stats.leastInfluential.absSum.toFixed(4)}
          </p>
        </div>
      </div>

      {/* Average influence per eval question */}
      <div className="bg-navy-800 rounded-lg border border-navy-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={14} className="text-blue-400" />
          <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">
            Average Influence per Eval Question
          </span>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.avgPerEval} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
                width={50}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: '#e2e8f0',
                }}
                formatter={(value: string | number | (string | number)[]) => {
                  const num = typeof value === 'number' ? value : Number(value);
                  return [num.toFixed(6), 'Avg Score'];
                }}
                labelFormatter={(
                  _label: string,
                  payload?: Array<{ payload?: AvgInfluenceEntry }>
                ) => {
                  if (payload && payload.length > 0 && payload[0].payload) {
                    return payload[0].payload.fullName;
                  }
                  return _label;
                }}
              />
              <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                {stats.avgPerEval.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.value >= 0 ? '#f43f5e' : '#3b82f6'}
                    fillOpacity={0.7}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Distribution histogram */}
      <div className="bg-navy-800 rounded-lg border border-navy-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">
            Score Distribution
          </span>
          <span className="text-[10px] text-slate-600">
            {stats.totalScores} total scores
          </span>
        </div>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.histogram} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
              <XAxis
                dataKey="range"
                tick={{ fontSize: 8, fill: '#94a3b8' }}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
                interval={Math.max(0, Math.floor(stats.histogram.length / 5) - 1)}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
                width={35}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: '#e2e8f0',
                }}
                formatter={(value: string | number | (string | number)[]) => [value, 'Count']}
              />
              <Bar dataKey="count" radius={[1, 1, 0, 0]}>
                {stats.histogram.map((entry, index) => (
                  <Cell
                    key={`hist-${index}`}
                    fill={entry.isPositive ? '#f43f5e' : '#3b82f6'}
                    fillOpacity={0.6}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
