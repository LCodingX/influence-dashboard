import { useState, useMemo, useCallback } from 'react';
import { FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import type { EvalResult } from '../../lib/types';

interface ResultsComparisonProps {
  results: EvalResult[] | null;
}

type ModelColumn = 'base' | 'fewshot' | 'finetuned';

const columnLabels: Record<ModelColumn, string> = {
  base: 'Base Model',
  fewshot: 'Few-Shot',
  finetuned: 'Fine-Tuned',
};

const columnColors: Record<ModelColumn, string> = {
  base: 'border-slate-500/40',
  fewshot: 'border-amber-500/40',
  finetuned: 'border-blue-500/40',
};

const columnHeaderColors: Record<ModelColumn, string> = {
  base: 'text-slate-400',
  fewshot: 'text-amber-500',
  finetuned: 'text-blue-500',
};

/**
 * Computes which words in `target` differ from `reference`.
 * Returns an array of segments with a `highlight` flag.
 */
function diffWords(
  reference: string,
  target: string
): Array<{ text: string; highlight: boolean }> {
  const refTokens = reference.split(/(\s+)/);
  const targetTokens = target.split(/(\s+)/);

  const segments: Array<{ text: string; highlight: boolean }> = [];
  let currentText = '';
  let currentHighlight = false;

  for (let i = 0; i < targetTokens.length; i++) {
    const token = targetTokens[i];
    const isWhitespace = /^\s+$/.test(token);

    if (isWhitespace) {
      currentText += token;
      continue;
    }

    const isDifferent = i >= refTokens.length || token !== refTokens[i];

    if (segments.length === 0 && currentText === '') {
      currentHighlight = isDifferent;
      currentText = token;
    } else if (isDifferent === currentHighlight) {
      currentText += token;
    } else {
      segments.push({ text: currentText, highlight: currentHighlight });
      currentHighlight = isDifferent;
      currentText = token;
    }
  }

  if (currentText) {
    segments.push({ text: currentText, highlight: currentHighlight });
  }

  return segments;
}

function OutputCard({
  column,
  content,
  baseContent,
}: {
  column: ModelColumn;
  content: string;
  baseContent: string;
}) {
  const segments = useMemo(() => {
    if (column === 'base') {
      return [{ text: content, highlight: false }];
    }
    return diffWords(baseContent, content);
  }, [column, content, baseContent]);

  return (
    <div
      className={[
        'flex flex-1 flex-col rounded-lg border bg-navy-900',
        'transition-colors duration-150',
        columnColors[column],
      ].join(' ')}
    >
      <div className="border-b border-navy-700 px-3 py-2">
        <span className={`text-xs font-semibold ${columnHeaderColors[column]}`}>
          {columnLabels[column]}
        </span>
      </div>
      <div className="flex-1 px-3 py-3">
        <p className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-slate-300">
          {segments.map((segment, i) =>
            segment.highlight ? (
              <span key={i} className="font-bold text-slate-50">
                {segment.text}
              </span>
            ) : (
              <span key={i}>{segment.text}</span>
            )
          )}
        </p>
      </div>
    </div>
  );
}

export function ResultsComparison({ results }: ResultsComparisonProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const goToPrevious = useCallback(() => {
    setActiveIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const goToNext = useCallback(() => {
    if (!results) return;
    setActiveIndex((prev) => Math.min(results.length - 1, prev + 1));
  }, [results]);

  const handleTabClick = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  if (!results || results.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-navy-700 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-50">Results Comparison</h2>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="rounded-full bg-navy-700 p-4">
            <FileText className="h-6 w-6 text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-300">No results yet</p>
            <p className="mt-1 max-w-xs text-xs text-slate-500">
              Run a training job to see side-by-side comparisons of base model, few-shot, and fine-tuned outputs.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const activeResult = results[activeIndex];

  return (
    <div className="flex h-full flex-col">
      {/* Header with navigation */}
      <div className="flex items-center justify-between border-b border-navy-700 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-50">Results Comparison</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToPrevious}
            disabled={activeIndex === 0}
            className={[
              'rounded-md p-1 transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
              activeIndex === 0
                ? 'cursor-not-allowed text-slate-600'
                : 'text-slate-400 hover:bg-navy-700 hover:text-slate-200',
            ].join(' ')}
            aria-label="Previous question"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-slate-400">
            {activeIndex + 1} / {results.length}
          </span>
          <button
            type="button"
            onClick={goToNext}
            disabled={activeIndex === results.length - 1}
            className={[
              'rounded-md p-1 transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
              activeIndex === results.length - 1
                ? 'cursor-not-allowed text-slate-600'
                : 'text-slate-400 hover:bg-navy-700 hover:text-slate-200',
            ].join(' ')}
            aria-label="Next question"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Question tabs */}
      <div className="flex border-b border-navy-700 overflow-x-auto" role="tablist">
        {results.map((result, index) => {
          const isActive = index === activeIndex;
          const truncatedQuestion =
            result.eval_question.length > 40
              ? `${result.eval_question.slice(0, 40)}...`
              : result.eval_question;

          return (
            <button
              key={index}
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTabClick(index)}
              className={[
                'flex-shrink-0 border-b-2 -mb-px px-4 py-2.5 text-xs font-medium',
                'transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50',
                isActive
                  ? 'border-blue-500 text-slate-50'
                  : 'border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-200',
              ].join(' ')}
              title={result.eval_question}
            >
              Q{index + 1}: {truncatedQuestion}
            </button>
          );
        })}
      </div>

      {/* Active question display */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Question */}
        <div className="mb-4 rounded-lg border border-navy-700 bg-navy-800 px-4 py-3">
          <span className="text-xs font-medium text-slate-400">Evaluation Question</span>
          <p className="mt-1 font-mono text-sm text-slate-50">
            {activeResult.eval_question}
          </p>
        </div>

        {/* Three-column comparison */}
        <div className="flex gap-3">
          <OutputCard
            column="base"
            content={activeResult.base_output}
            baseContent={activeResult.base_output}
          />
          <OutputCard
            column="fewshot"
            content={activeResult.fewshot_output}
            baseContent={activeResult.base_output}
          />
          <OutputCard
            column="finetuned"
            content={activeResult.finetuned_output}
            baseContent={activeResult.base_output}
          />
        </div>
      </div>
    </div>
  );
}
