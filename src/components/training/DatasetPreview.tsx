import { useMemo, useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, FileJson, Hash } from 'lucide-react';
import type { QAPair } from '../../lib/types';

interface DatasetPreviewProps {
  pairs: QAPair[];
}

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

function formatDataset(pairs: QAPair[]): string {
  const entries = pairs.map((pair) => ({
    question: pair.question,
    answer: pair.answer,
  }));
  return JSON.stringify(entries, null, 2);
}

export function DatasetPreview({ pairs }: DatasetPreviewProps) {
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const totalTokens = useMemo(() => {
    return pairs.reduce((sum, pair) => {
      return sum + estimateTokenCount(pair.question) + estimateTokenCount(pair.answer);
    }, 0);
  }, [pairs]);

  const formattedJson = useMemo(() => formatDataset(pairs), [pairs]);

  if (pairs.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-navy-700 bg-navy-800 transition-colors duration-150">
      <button
        type="button"
        onClick={toggleExpanded}
        className={[
          'flex w-full items-center gap-3 px-4 py-3 text-left',
          'transition-colors duration-150',
          'hover:bg-navy-700/50',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/50',
          expanded ? 'rounded-t-lg' : 'rounded-lg',
        ].join(' ')}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
        )}
        <FileJson className="h-4 w-4 flex-shrink-0 text-blue-500" />
        <span className="text-sm font-medium text-slate-50">
          Dataset Preview
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <Hash className="h-3 w-3" />
            {pairs.length} example{pairs.length !== 1 ? 's' : ''}
          </span>
          <span className="text-xs text-slate-500">|</span>
          <span className="text-xs text-slate-400">
            ~{totalTokens.toLocaleString()} tokens
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-navy-700">
          <pre className="max-h-96 overflow-auto px-4 py-3 font-mono text-xs leading-relaxed text-slate-300">
            {formattedJson}
          </pre>
        </div>
      )}
    </div>
  );
}
