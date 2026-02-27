import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Zap,
  BarChart3,
  CircleDot,
} from 'lucide-react';
import type { Job, JobStatus as JobStatusType } from '@/lib/types';

interface JobStatusProps {
  job: Job | null;
}

const STATUS_CONFIG: Record<
  JobStatusType,
  {
    label: string;
    icon: typeof Loader2;
    colorClass: string;
    bgClass: string;
    animate: boolean;
  }
> = {
  queued: {
    label: 'Queued',
    icon: Clock,
    colorClass: 'text-slate-400',
    bgClass: 'bg-slate-500/10 border-slate-500/20',
    animate: false,
  },
  starting: {
    label: 'Starting',
    icon: Loader2,
    colorClass: 'text-blue-400',
    bgClass: 'bg-blue-500/10 border-blue-500/20',
    animate: true,
  },
  training: {
    label: 'Training',
    icon: Zap,
    colorClass: 'text-amber-400',
    bgClass: 'bg-amber-500/10 border-amber-500/20',
    animate: true,
  },
  computing_influence: {
    label: 'Computing Influence',
    icon: BarChart3,
    colorClass: 'text-purple-400',
    bgClass: 'bg-purple-500/10 border-purple-500/20',
    animate: true,
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    colorClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500/10 border-emerald-500/20',
    animate: false,
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    colorClass: 'text-rose-400',
    bgClass: 'bg-rose-500/10 border-rose-500/20',
    animate: false,
  },
};

function formatETA(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '--';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

export function JobStatus({ job }: JobStatusProps) {
  if (!job) {
    return (
      <div className="bg-navy-800 rounded-lg border border-navy-700 p-4">
        <div className="flex items-center gap-2 mb-2">
          <CircleDot size={14} className="text-slate-600" />
          <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">
            Job Status
          </span>
        </div>
        <p className="text-sm text-slate-500">
          No active job. Configure your experiment and start training.
        </p>
      </div>
    );
  }

  const config = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.queued;
  const StatusIcon = config.icon;

  // Force 100% when completed, 0% when failed, otherwise use reported progress
  const rawProgress = job.progress ?? 0;
  const progressPercent =
    job.status === 'completed'
      ? 100
      : job.status === 'failed'
        ? Math.round(rawProgress * 100)
        : Math.round(rawProgress * 100);

  const hasEpochData =
    job.total_epochs != null && job.total_epochs > 0 && job.current_epoch != null;
  const hasLossData =
    job.training_loss != null && job.training_loss > 0;

  return (
    <div className="bg-navy-800 rounded-lg border border-navy-700 p-4">
      {/* Status header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusIcon
            size={16}
            className={`${config.colorClass} ${config.animate ? 'animate-spin' : ''}`}
          />
          <span className={`text-sm font-semibold ${config.colorClass}`}>
            {config.label}
          </span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${config.bgClass} ${config.colorClass}`}>
          {progressPercent}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-navy-900 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            job.status === 'failed'
              ? 'bg-rose-500'
              : job.status === 'completed'
                ? 'bg-emerald-500'
                : 'bg-blue-500'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Stats grid — only show metrics that have real data */}
      {(hasEpochData || hasLossData) && (
        <div className="grid grid-cols-2 gap-3">
          {hasEpochData && (
            <div>
              <span className="text-[10px] text-slate-600 uppercase tracking-wider">
                Epoch
              </span>
              <p className="text-sm font-mono text-slate-200">
                {job.current_epoch}
                <span className="text-slate-500">/{job.total_epochs}</span>
              </p>
            </div>
          )}

          {hasLossData && (
            <div>
              <span className="text-[10px] text-slate-600 uppercase tracking-wider">
                Loss
              </span>
              <p className="text-sm font-mono text-slate-200">
                {job.training_loss!.toFixed(4)}
              </p>
            </div>
          )}

          {/* ETA - only when actively running with progress */}
          {job.status !== 'completed' && job.status !== 'failed' && rawProgress > 0 && job.created_at && (
            <div>
              <span className="text-[10px] text-slate-600 uppercase tracking-wider">
                ETA
              </span>
              <p className="text-sm font-mono text-slate-200">
                {(() => {
                  const elapsed =
                    (new Date().getTime() - new Date(job.created_at).getTime()) / 1000;
                  const estimated = elapsed / rawProgress - elapsed;
                  return formatETA(estimated);
                })()}
              </p>
            </div>
          )}

          {job.estimated_cost_usd != null && (
            <div>
              <span className="text-[10px] text-slate-600 uppercase tracking-wider">
                Est. Cost
              </span>
              <p className="text-sm font-mono text-slate-200">
                ${job.estimated_cost_usd.toFixed(2)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {job.status === 'failed' && job.error && (
        <div className="mt-3 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-md">
          <p className="text-xs text-rose-300 font-mono leading-relaxed">
            {job.error}
          </p>
        </div>
      )}
    </div>
  );
}
