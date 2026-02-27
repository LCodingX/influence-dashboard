import { useMemo } from 'react';
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { InfluenceMatrix } from '@/lib/types';

interface InfluenceDetailProps {
  matrix: InfluenceMatrix;
  trainIndex: number;
  evalIndex: number;
  onClose: () => void;
}

export function InfluenceDetail({
  matrix,
  trainIndex,
  evalIndex,
  onClose,
}: InfluenceDetailProps) {
  const score = matrix.scores?.[trainIndex]?.[evalIndex] ?? 0;
  const trainLabel = matrix.training_labels?.[trainIndex] ?? `Training #${trainIndex + 1}`;
  const evalLabel = matrix.eval_labels?.[evalIndex] ?? `Eval #${evalIndex + 1}`;

  const rank = useMemo(() => {
    if (!Array.isArray(matrix.scores)) return 1;
    const column = matrix.scores.map((row) => row?.[evalIndex] ?? 0);
    const sorted = [...column]
      .map((s, idx) => ({ score: Math.abs(s), idx }))
      .sort((a, b) => b.score - a.score);
    const position = sorted.findIndex((entry) => entry.idx === trainIndex);
    return position + 1;
  }, [matrix, trainIndex, evalIndex]);

  const totalTraining = matrix.training_labels?.length ?? 0;

  const scoreSign = score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral';

  const ScoreIcon =
    scoreSign === 'positive'
      ? TrendingUp
      : scoreSign === 'negative'
        ? TrendingDown
        : Minus;

  const scoreColorClass =
    scoreSign === 'positive'
      ? 'text-rose-400'
      : scoreSign === 'negative'
        ? 'text-blue-400'
        : 'text-slate-400';

  const scoreBgClass =
    scoreSign === 'positive'
      ? 'bg-rose-500/10 border-rose-500/30'
      : scoreSign === 'negative'
        ? 'bg-blue-500/10 border-blue-500/30'
        : 'bg-slate-500/10 border-slate-500/30';

  return (
    <div className="bg-navy-800 rounded-lg border border-navy-700 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-50 text-sm font-semibold">
          Influence Detail
        </h3>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-200 hover:bg-navy-700 rounded transition-colors duration-150"
          aria-label="Close detail view"
        >
          <X size={16} />
        </button>
      </div>

      {/* Score indicator */}
      <div className={`flex items-center gap-3 p-3 rounded-lg border mb-4 ${scoreBgClass}`}>
        <ScoreIcon size={20} className={scoreColorClass} />
        <div>
          <div className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">
            Influence Score
          </div>
          <div className={`text-lg font-mono font-bold ${scoreColorClass}`}>
            {score >= 0 ? '+' : ''}{score.toFixed(6)}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">
            Rank
          </div>
          <div className="text-lg font-mono font-bold text-slate-200">
            {rank}<span className="text-slate-500 text-sm">/{totalTraining}</span>
          </div>
        </div>
      </div>

      {/* Training example */}
      <div className="mb-4">
        <div className="text-[11px] text-slate-500 uppercase tracking-wider font-medium mb-1.5">
          Training Example #{trainIndex + 1}
        </div>
        <div className="bg-navy-900 rounded-md p-3 border border-navy-700">
          <div className="mb-2">
            <span className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">
              Question
            </span>
            <p className="text-sm text-slate-200 font-mono mt-0.5 leading-relaxed">
              {trainLabel}
            </p>
          </div>
        </div>
      </div>

      {/* Eval question */}
      <div>
        <div className="text-[11px] text-slate-500 uppercase tracking-wider font-medium mb-1.5">
          Evaluation Question #{evalIndex + 1}
        </div>
        <div className="bg-navy-900 rounded-md p-3 border border-navy-700">
          <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
            Question
          </span>
          <p className="text-sm text-slate-200 font-mono mt-0.5 leading-relaxed">
            {evalLabel}
          </p>
        </div>
      </div>

      {/* Interpretation */}
      <div className="mt-4 p-3 bg-navy-900/50 rounded-md border border-navy-700/50">
        <p className="text-xs text-slate-400 leading-relaxed">
          {scoreSign === 'positive'
            ? 'This training example has a positive influence on the evaluation output, meaning the model\'s response to the eval question becomes more similar to patterns in this training example.'
            : scoreSign === 'negative'
              ? 'This training example has a negative influence on the evaluation output, meaning it pushes the model\'s response away from patterns in this training example.'
              : 'This training example has negligible influence on the evaluation output.'}
        </p>
      </div>
    </div>
  );
}
