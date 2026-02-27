import { useCallback, useState } from 'react';
import { Plus, Upload } from 'lucide-react';
import type { QAPair } from '../../lib/types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { QAPairEditor } from './QAPairEditor';
import { DatasetPreview } from './DatasetPreview';

interface TrainingPanelProps {
  pairs: QAPair[];
  onChange: (pairs: QAPair[]) => void;
}

interface ImportDialogState {
  open: boolean;
  value: string;
  error: string | null;
}

function parseImportedJson(raw: string): QAPair[] | string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return 'Invalid JSON. Please paste a valid JSON array.';
  }

  if (!Array.isArray(parsed)) {
    return 'Expected a JSON array of objects with "question" and "answer" fields.';
  }

  const pairs: QAPair[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i] as Record<string, unknown>;
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof item.question !== 'string' ||
      typeof item.answer !== 'string'
    ) {
      return `Item at index ${i} must have "question" (string) and "answer" (string) fields.`;
    }
    pairs.push({
      id: crypto.randomUUID(),
      question: item.question,
      answer: item.answer,
    });
  }

  if (pairs.length === 0) {
    return 'Array is empty. Please provide at least one QA pair.';
  }

  return pairs;
}

export function TrainingPanel({ pairs, onChange }: TrainingPanelProps) {
  const [importDialog, setImportDialog] = useState<ImportDialogState>({
    open: false,
    value: '',
    error: null,
  });

  const handleAddPair = useCallback(() => {
    const newPair: QAPair = {
      id: crypto.randomUUID(),
      question: '',
      answer: '',
    };
    onChange([...pairs, newPair]);
  }, [pairs, onChange]);

  const handlePairChange = useCallback(
    (updated: QAPair) => {
      onChange(pairs.map((p) => (p.id === updated.id ? updated : p)));
    },
    [pairs, onChange]
  );

  const handlePairDelete = useCallback(
    (id: string) => {
      onChange(pairs.filter((p) => p.id !== id));
    },
    [pairs, onChange]
  );

  const openImportDialog = useCallback(() => {
    setImportDialog({ open: true, value: '', error: null });
  }, []);

  const closeImportDialog = useCallback(() => {
    setImportDialog({ open: false, value: '', error: null });
  }, []);

  const handleImportChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setImportDialog((prev) => ({ ...prev, value: e.target.value, error: null }));
    },
    []
  );

  const handleImportSubmit = useCallback(() => {
    const result = parseImportedJson(importDialog.value);
    if (typeof result === 'string') {
      setImportDialog((prev) => ({ ...prev, error: result }));
      return;
    }
    onChange([...pairs, ...result]);
    closeImportDialog();
  }, [importDialog.value, pairs, onChange, closeImportDialog]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-navy-700 px-5 py-4">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-slate-50">Training Data</h2>
          <Badge variant="info">{pairs.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<Upload className="h-3.5 w-3.5" />}
            onClick={openImportDialog}
          >
            Import JSON
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={handleAddPair}
          >
            Add Example
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {pairs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="rounded-full bg-navy-700 p-4">
              <Plus className="h-6 w-6 text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300">No training examples yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Add question-answer pairs to define your fine-tuning dataset.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={handleAddPair}
            >
              Add First Example
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {pairs.map((pair, index) => (
              <QAPairEditor
                key={pair.id}
                pair={pair}
                index={index}
                onChange={handlePairChange}
                onDelete={handlePairDelete}
              />
            ))}
            <DatasetPreview pairs={pairs} />
          </div>
        )}
      </div>

      {/* Import JSON Dialog */}
      {importDialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div
            className="w-full max-w-lg rounded-xl border border-navy-700 bg-navy-800 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Import JSON"
          >
            <div className="border-b border-navy-700 px-5 py-4">
              <h3 className="text-sm font-semibold text-slate-50">Import Training Data</h3>
              <p className="mt-1 text-xs text-slate-400">
                Paste a JSON array of objects with &quot;question&quot; and &quot;answer&quot; fields.
              </p>
            </div>

            <div className="px-5 py-4">
              <textarea
                value={importDialog.value}
                onChange={handleImportChange}
                placeholder={`[\n  { "question": "What is...", "answer": "It is..." },\n  { "question": "How does...", "answer": "It works..." }\n]`}
                rows={10}
                className={[
                  'w-full rounded-lg border bg-navy-900 px-3 py-2',
                  'font-mono text-sm text-slate-50',
                  'placeholder:text-slate-500',
                  'transition-colors duration-150',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-1 focus:ring-offset-navy-900',
                  importDialog.error
                    ? 'border-rose-500'
                    : 'border-navy-700 focus:border-blue-500',
                ].join(' ')}
              />
              {importDialog.error && (
                <p className="mt-2 text-xs text-rose-500">{importDialog.error}</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-navy-700 px-5 py-3">
              <Button variant="ghost" size="sm" onClick={closeImportDialog}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleImportSubmit}
                disabled={importDialog.value.trim().length === 0}
              >
                Import
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
