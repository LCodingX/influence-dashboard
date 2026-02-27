import { Trash2, Database, HelpCircle, Clock } from 'lucide-react';
import type { Experiment } from '@/lib/types';
import { MODELS, INFLUENCE_METHODS } from '@/lib/constants';

interface ExperimentCardProps {
  experiment: Experiment;
  onSelect: (experiment: Experiment) => void;
  onDelete: (id: string) => void;
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffWeeks === 1) return '1 week ago';
  if (diffWeeks < 5) return `${diffWeeks} weeks ago`;
  if (diffMonths === 1) return '1 month ago';
  return `${diffMonths} months ago`;
}

export function ExperimentCard({
  experiment,
  onSelect,
  onDelete,
}: ExperimentCardProps) {
  const model = MODELS.find((m) => m.id === experiment.model_id);
  const influenceMethod = INFLUENCE_METHODS.find(
    (m) => m.value === experiment.influence_method
  );

  const trainingCount = experiment.training_data.length;
  const evalCount = experiment.eval_data.length;

  return (
    <div
      className="group bg-navy-800 rounded-lg border border-navy-700 p-4 hover:border-blue-500/50 transition-colors duration-150 cursor-pointer"
      onClick={() => onSelect(experiment)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(experiment);
        }
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-semibold text-slate-100 truncate pr-2">
          {experiment.name}
        </h4>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(experiment.id);
          }}
          className="p-1 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors duration-150 opacity-0 group-hover:opacity-100"
          aria-label={`Delete experiment ${experiment.name}`}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Description */}
      {experiment.description && (
        <p className="text-xs text-slate-400 mb-3 line-clamp-2">
          {experiment.description}
        </p>
      )}

      {/* Model + Influence method badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/15 text-blue-400 border border-blue-500/20">
          {model?.name ?? experiment.model_id}
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/20">
          {influenceMethod?.label ?? experiment.influence_method}
        </span>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-[11px] text-slate-500">
        <div className="flex items-center gap-1" title="Training examples">
          <Database size={11} />
          <span>{trainingCount} train</span>
        </div>
        <div className="flex items-center gap-1" title="Evaluation questions">
          <HelpCircle size={11} />
          <span>{evalCount} eval</span>
        </div>
        <div className="flex items-center gap-1 ml-auto" title={new Date(experiment.created_at).toLocaleString()}>
          <Clock size={11} />
          <span>{formatRelativeDate(experiment.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
