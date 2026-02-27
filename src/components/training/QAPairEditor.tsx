import { useCallback, useRef, useEffect, useState } from 'react';
import { Trash2, GripVertical } from 'lucide-react';
import type { QAPair } from '../../lib/types';

interface QAPairEditorProps {
  pair: QAPair;
  index: number;
  onChange: (updated: QAPair) => void;
  onDelete: (id: string) => void;
}

function useAutoResize(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = ref.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  return ref;
}

export function QAPairEditor({ pair, index, onChange, onDelete }: QAPairEditorProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const questionRef = useAutoResize(pair.question);
  const answerRef = useAutoResize(pair.answer);

  const handleQuestionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange({ ...pair, question: e.target.value });
    },
    [pair, onChange]
  );

  const handleAnswerChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange({ ...pair, answer: e.target.value });
    },
    [pair, onChange]
  );

  const handleDeleteClick = useCallback(() => {
    if (confirmDelete) {
      onDelete(pair.id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
    }
  }, [confirmDelete, onDelete, pair.id]);

  const handleDeleteBlur = useCallback(() => {
    setConfirmDelete(false);
  }, []);

  return (
    <div className="group rounded-lg border border-navy-700 bg-navy-800 transition-colors duration-150">
      <div className="flex items-center gap-2 border-b border-navy-700 px-3 py-2">
        <GripVertical className="h-4 w-4 flex-shrink-0 cursor-grab text-slate-500 transition-colors duration-150 group-hover:text-slate-400" />
        <span className="text-xs font-semibold text-slate-400">
          #{index + 1}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleDeleteClick}
          onBlur={handleDeleteBlur}
          className={[
            'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50',
            confirmDelete
              ? 'bg-rose-500 text-white'
              : 'text-slate-500 hover:bg-rose-500/10 hover:text-rose-400',
          ].join(' ')}
          aria-label={confirmDelete ? 'Confirm delete' : `Delete pair #${index + 1}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {confirmDelete && <span>Confirm</span>}
        </button>
      </div>

      <div className="space-y-3 p-3">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`qa-question-${pair.id}`}
            className="text-xs font-medium text-slate-400"
          >
            Question
          </label>
          <textarea
            ref={questionRef}
            id={`qa-question-${pair.id}`}
            value={pair.question}
            onChange={handleQuestionChange}
            placeholder="Enter question..."
            rows={1}
            className={[
              'w-full resize-none overflow-hidden rounded-lg border border-navy-700 bg-navy-900 px-3 py-2',
              'font-mono text-sm text-slate-50',
              'placeholder:text-slate-500',
              'transition-colors duration-150',
              'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-1 focus:ring-offset-navy-900',
            ].join(' ')}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={`qa-answer-${pair.id}`}
            className="text-xs font-medium text-slate-400"
          >
            Answer
          </label>
          <textarea
            ref={answerRef}
            id={`qa-answer-${pair.id}`}
            value={pair.answer}
            onChange={handleAnswerChange}
            placeholder="Enter answer..."
            rows={1}
            className={[
              'w-full resize-none overflow-hidden rounded-lg border border-navy-700 bg-navy-900 px-3 py-2',
              'font-mono text-sm text-slate-50',
              'placeholder:text-slate-500',
              'transition-colors duration-150',
              'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-1 focus:ring-offset-navy-900',
            ].join(' ')}
          />
        </div>
      </div>
    </div>
  );
}
