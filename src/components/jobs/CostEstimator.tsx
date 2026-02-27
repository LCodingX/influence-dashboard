import { useMemo } from 'react';
import { DollarSign, Clock, AlertTriangle } from 'lucide-react';
import type { Hyperparams, InfluenceMethod } from '@/lib/types';
import { estimateCost } from '@/lib/costEstimation';

interface CostEstimatorProps {
  modelId: string;
  hyperparams: Hyperparams;
  influenceMethod: InfluenceMethod;
  numTrainingExamples: number;
  numEvalExamples: number;
}

const EXPENSIVE_THRESHOLD = 5;

export function CostEstimator({
  modelId,
  hyperparams,
  influenceMethod,
  numTrainingExamples,
  numEvalExamples,
}: CostEstimatorProps) {
  const estimate = useMemo(
    () =>
      estimateCost(
        modelId,
        hyperparams,
        influenceMethod,
        numTrainingExamples,
        numEvalExamples
      ),
    [modelId, hyperparams, influenceMethod, numTrainingExamples, numEvalExamples]
  );

  const isExpensive = estimate.totalCost > EXPENSIVE_THRESHOLD;

  const formatTime = (minutes: number): string => {
    if (minutes < 1) return '<1 min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMins = Math.round(minutes % 60);
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  };

  return (
    <div className="bg-navy-800 rounded-lg border border-navy-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <DollarSign size={14} className="text-emerald-400" />
          <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">
            Cost Estimate
          </span>
        </div>
        {isExpensive && (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[10px] text-amber-400 font-medium">
            <AlertTriangle size={10} />
            <span>High cost</span>
          </div>
        )}
      </div>

      {/* Cost breakdown */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Training</span>
          <span className="text-xs font-mono text-slate-200">
            ${(estimate.trainingCost ?? 0).toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">Influence computation</span>
          <span className="text-xs font-mono text-slate-200">
            ${(estimate.influenceCost ?? 0).toFixed(2)}
          </span>
        </div>
        <div className="border-t border-navy-700 pt-2 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-200">Total</span>
          <span
            className={`text-sm font-mono font-bold ${
              isExpensive ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            ${(estimate.totalCost ?? 0).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Time estimate */}
      <div className="mt-3 pt-3 border-t border-navy-700/50 flex items-center gap-2">
        <Clock size={12} className="text-slate-500" />
        <span className="text-[11px] text-slate-400">
          Estimated time: {formatTime(estimate.estimatedTimeMinutes)}
        </span>
      </div>

      {/* Pricing label */}
      <div className="mt-2 text-[10px] text-slate-500">
        RunPod pricing
      </div>

      {/* Data summary */}
      <div className="mt-1 text-[10px] text-slate-600">
        {numTrainingExamples} training &middot; {numEvalExamples} eval examples
      </div>
    </div>
  );
}
