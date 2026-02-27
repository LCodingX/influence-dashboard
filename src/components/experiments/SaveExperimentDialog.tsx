import { useState, useEffect, useRef } from 'react';
import { X, Save, Loader2 } from 'lucide-react';

interface SaveExperimentDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
  saving: boolean;
  error?: string | null;
}

export function SaveExperimentDialog({
  open,
  onClose,
  onSave,
  saving,
  error,
}: SaveExperimentDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      // Focus the name input after a brief delay for the dialog to render
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const canSave = name.trim().length > 0 && !saving;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSave) {
      onSave(name.trim(), description.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-navy-800 border border-navy-700 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-slate-100">
            Save Experiment
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-navy-700 rounded transition-colors duration-150"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label
              htmlFor="experiment-name"
              className="block text-xs text-slate-400 font-medium mb-1.5"
            >
              Name <span className="text-rose-400">*</span>
            </label>
            <input
              ref={nameInputRef}
              id="experiment-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Factual QA - Gemma 12B"
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
              maxLength={100}
              disabled={saving}
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="experiment-description"
              className="block text-xs text-slate-400 font-medium mb-1.5"
            >
              Description <span className="text-slate-600">(optional)</span>
            </label>
            <textarea
              id="experiment-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you testing? What do you expect to find?"
              className="w-full px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150 resize-none"
              rows={3}
              maxLength={500}
              disabled={saving}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-navy-700 rounded-lg transition-colors duration-150 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
