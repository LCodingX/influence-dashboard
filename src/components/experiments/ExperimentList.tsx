import { useState, useMemo } from 'react';
import { Search, FlaskConical, Loader2 } from 'lucide-react';
import type { Experiment } from '@/lib/types';
import { ExperimentCard } from './ExperimentCard';

interface ExperimentListProps {
  experiments: Experiment[];
  onSelect: (experiment: Experiment) => void;
  onDelete: (id: string) => void;
  loading: boolean;
}

export function ExperimentList({
  experiments,
  onSelect,
  onDelete,
  loading,
}: ExperimentListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return experiments;
    const q = searchQuery.toLowerCase();
    return experiments.filter(
      (exp) =>
        exp.name.toLowerCase().includes(q) ||
        (exp.description && exp.description.toLowerCase().includes(q)) ||
        exp.model_id.toLowerCase().includes(q) ||
        exp.influence_method.toLowerCase().includes(q)
    );
  }, [experiments, searchQuery]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 size={24} className="text-blue-400 animate-spin" />
        <p className="text-sm text-slate-400">Loading experiments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search experiments..."
          className="w-full pl-9 pr-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-150"
        />
      </div>

      {/* Experiment grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((experiment) => (
            <ExperimentCard
              key={experiment.id}
              experiment={experiment}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : experiments.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 bg-navy-800 rounded-lg border border-navy-700">
          <FlaskConical size={32} className="text-slate-600" />
          <p className="text-sm text-slate-400">No experiments yet</p>
          <p className="text-xs text-slate-600 max-w-xs text-center">
            Configure your training data, evaluation questions, and model
            settings, then save as an experiment to get started.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-32 gap-2 bg-navy-800 rounded-lg border border-navy-700">
          <p className="text-sm text-slate-400">No experiments match your search</p>
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors duration-150"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}
