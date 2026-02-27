import { useCallback } from 'react';
import { Plus } from 'lucide-react';
import type { EvalQuestion } from '../../lib/types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { EvalQuestionEditor } from './EvalQuestionEditor';

interface EvaluationPanelProps {
  questions: EvalQuestion[];
  onChange: (questions: EvalQuestion[]) => void;
}

export function EvaluationPanel({ questions, onChange }: EvaluationPanelProps) {
  const handleAddQuestion = useCallback(() => {
    const newQuestion: EvalQuestion = {
      id: crypto.randomUUID(),
      question: '',
    };
    onChange([...questions, newQuestion]);
  }, [questions, onChange]);

  const handleQuestionChange = useCallback(
    (updated: EvalQuestion) => {
      onChange(questions.map((q) => (q.id === updated.id ? updated : q)));
    },
    [questions, onChange]
  );

  const handleQuestionDelete = useCallback(
    (id: string) => {
      onChange(questions.filter((q) => q.id !== id));
    },
    [questions, onChange]
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-navy-700 px-5 py-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-slate-50">Evaluation Questions</h2>
          <Badge variant="info">{questions.length}</Badge>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={handleAddQuestion}
        >
          Add Question
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {questions.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="rounded-full bg-navy-700 p-4">
              <Plus className="h-6 w-6 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300">No evaluation questions yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Add questions to test how the fine-tuned model generalizes.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={handleAddQuestion}
            >
              Add First Question
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {questions.map((question, index) => (
              <EvalQuestionEditor
                key={question.id}
                question={question}
                index={index}
                onChange={handleQuestionChange}
                onDelete={handleQuestionDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
