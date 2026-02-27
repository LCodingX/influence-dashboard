import { useCallback, useRef, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { EvalQuestion } from '../../lib/types';

interface EvalQuestionEditorProps {
  question: EvalQuestion;
  index: number;
  onChange: (updated: EvalQuestion) => void;
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

export function EvalQuestionEditor({ question, index, onChange, onDelete }: EvalQuestionEditorProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const textareaRef = useAutoResize(question.question);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange({ ...question, question: e.target.value });
    },
    [question, onChange]
  );

  const handleDeleteClick = useCallback(() => {
    if (confirmDelete) {
      onDelete(question.id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
    }
  }, [confirmDelete, onDelete, question.id]);

  const handleDeleteBlur = useCallback(() => {
    setConfirmDelete(false);
  }, []);

  return (
    <div className="group rounded-lg border border-navy-700 bg-navy-800 transition-colors duration-150">
      <div className="flex items-center gap-2 border-b border-navy-700 px-3 py-2">
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
          aria-label={confirmDelete ? 'Confirm delete' : `Delete question #${index + 1}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {confirmDelete && <span>Confirm</span>}
        </button>
      </div>

      <div className="p-3">
        <textarea
          ref={textareaRef}
          id={`eval-question-${question.id}`}
          value={question.question}
          onChange={handleChange}
          placeholder="Enter evaluation question..."
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
  );
}
