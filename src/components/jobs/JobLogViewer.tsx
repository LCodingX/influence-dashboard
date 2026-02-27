import { useEffect, useRef, useState } from 'react';
import { Terminal, ArrowDown, Copy, Check } from 'lucide-react';
import type { JobLogEntry, LogLevel, LogPhase } from '@/lib/types';

interface JobLogViewerProps {
  logs: JobLogEntry[];
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  info: 'text-slate-400',
  warn: 'text-amber-400',
  error: 'text-rose-400',
  debug: 'text-slate-600',
};

const LEVEL_BG: Record<LogLevel, string> = {
  info: 'bg-slate-500/20',
  warn: 'bg-amber-500/20',
  error: 'bg-rose-500/20',
  debug: 'bg-slate-500/10',
};

const PHASE_COLORS: Record<LogPhase, string> = {
  system: 'bg-slate-500/20 text-slate-400',
  model_loading: 'bg-blue-500/20 text-blue-400',
  training: 'bg-amber-500/20 text-amber-400',
  influence: 'bg-purple-500/20 text-purple-400',
  eval: 'bg-emerald-500/20 text-emerald-400',
};

function formatTimestamp(ts: string): string {
  try {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '--:--:--';
  }
}

export function JobLogViewer({ logs }: JobLogViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);

  // Auto-scroll when new logs arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Detect manual scroll
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 30;
    setAutoScroll(isAtBottom);
  };

  const handleCopy = () => {
    const text = logs
      .map(
        (l) =>
          `[${formatTimestamp(l.timestamp)}] [${l.level.toUpperCase()}]${l.phase ? ` [${l.phase}]` : ''} ${l.message}`
      )
      .join('\n');
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
      setAutoScroll(true);
    }
  };

  return (
    <div className="rounded-lg border border-navy-700 bg-[#0B1120] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-navy-700 bg-navy-800/50">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-slate-500" />
          <span className="text-xs text-slate-400 font-medium">
            Logs ({logs.length})
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!autoScroll && (
            <button
              type="button"
              onClick={scrollToBottom}
              className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-slate-400 hover:bg-navy-700 transition-colors"
            >
              <ArrowDown size={10} />
              Scroll to bottom
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 rounded px-2 py-1 text-[10px] text-slate-400 hover:bg-navy-700 transition-colors"
          >
            {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Log entries */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-[300px] overflow-y-auto font-mono text-xs leading-relaxed p-2 space-y-px"
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-600">
            Waiting for logs...
          </div>
        ) : (
          logs.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-2 px-1 py-0.5 rounded hover:bg-white/[0.02] transition-colors"
            >
              <span className="text-slate-600 flex-shrink-0 select-none">
                {formatTimestamp(entry.timestamp)}
              </span>
              <span
                className={`px-1.5 py-px rounded text-[10px] font-medium uppercase flex-shrink-0 ${
                  LEVEL_BG[entry.level as LogLevel] ?? LEVEL_BG.info
                } ${LEVEL_COLORS[entry.level as LogLevel] ?? LEVEL_COLORS.info}`}
              >
                {entry.level}
              </span>
              {entry.phase && (
                <span
                  className={`px-1.5 py-px rounded-full text-[10px] flex-shrink-0 ${
                    PHASE_COLORS[entry.phase as LogPhase] ?? PHASE_COLORS.system
                  }`}
                >
                  {entry.phase}
                </span>
              )}
              <span
                className={
                  entry.level === 'error'
                    ? 'text-rose-300'
                    : entry.level === 'warn'
                      ? 'text-amber-300'
                      : entry.level === 'debug'
                        ? 'text-slate-600'
                        : 'text-slate-300'
                }
              >
                {entry.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
