import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import type { Job, JobStatus } from '@/lib/types';
import { MODELS } from '@/lib/constants';

interface JobHistoryProps {
  jobs: Job[];
  onSelect: (job: Job) => void;
}

const STATUS_ICON_MAP: Record<JobStatus, typeof CheckCircle2> = {
  queued: Clock,
  starting: Loader2,
  training: Loader2,
  computing_influence: Loader2,
  completed: CheckCircle2,
  failed: XCircle,
};

const STATUS_COLOR_MAP: Record<JobStatus, string> = {
  queued: 'text-slate-400',
  starting: 'text-blue-400',
  training: 'text-amber-400',
  computing_influence: 'text-purple-400',
  completed: 'text-emerald-400',
  failed: 'text-rose-400',
};

const STATUS_LABEL_MAP: Record<JobStatus, string> = {
  queued: 'Queued',
  starting: 'Starting',
  training: 'Training',
  computing_influence: 'Computing',
  completed: 'Completed',
  failed: 'Failed',
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function JobHistory({ jobs, onSelect }: JobHistoryProps) {
  if (jobs.length === 0) {
    return (
      <div className="bg-navy-800 rounded-lg border border-navy-700 p-4">
        <h3 className="text-sm font-semibold text-slate-100 mb-3">
          Job History
        </h3>
        <div className="flex flex-col items-center justify-center h-24 gap-2">
          <Clock size={20} className="text-slate-600" />
          <p className="text-xs text-slate-500">No jobs yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-navy-800 rounded-lg border border-navy-700 p-4">
      <h3 className="text-sm font-semibold text-slate-100 mb-3">
        Job History
      </h3>

      <div className="space-y-1">
        {jobs.map((job) => {
          const Icon = STATUS_ICON_MAP[job.status];
          const colorClass = STATUS_COLOR_MAP[job.status];
          const isActive =
            job.status !== 'completed' && job.status !== 'failed';
          const model = MODELS.find((m) => m.id === job.config.model_id);

          return (
            <button
              key={job.id}
              onClick={() => onSelect(job)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-navy-700/50 transition-colors duration-150 text-left group"
            >
              <Icon
                size={14}
                className={`${colorClass} flex-shrink-0 ${isActive ? 'animate-spin' : ''}`}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-200 truncate">
                    {model?.name ?? job.config.model_id}
                  </span>
                  <span className={`text-[10px] ${colorClass}`}>
                    {STATUS_LABEL_MAP[job.status]}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-slate-500">
                    {formatDate(job.created_at)}
                  </span>
                  {job.estimated_cost_usd !== null && (
                    <span className="text-[10px] text-slate-600">
                      ${job.estimated_cost_usd.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              <ChevronRight
                size={14}
                className="text-slate-600 group-hover:text-slate-400 flex-shrink-0 transition-colors duration-150"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
