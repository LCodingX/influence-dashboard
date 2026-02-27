import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Search, Cpu } from 'lucide-react';
import { MODELS, TIER_BADGES } from '@/lib/constants';
import type { ModelInfo, ModelTier } from '@/lib/types';

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
}

function TierBadge({ tier }: { tier: ModelTier }) {
  const badge = TIER_BADGES[tier];
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${badge.color}`}
    >
      {badge.label}
    </span>
  );
}

function ModelOptionRow({
  model,
  selected,
  onSelect,
}: {
  model: ModelInfo;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm',
        'transition-colors duration-150',
        selected
          ? 'bg-blue-500/10 text-blue-400'
          : 'text-slate-50 hover:bg-navy-700',
      ].join(' ')}
    >
      <div className="flex flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="font-medium">{model.name}</span>
          <TierBadge tier={model.tier} />
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>{model.params} params</span>
          <span className="flex items-center gap-1">
            <Cpu className="h-3 w-3" />
            {model.gpu}
          </span>
          <span>${model.costPerHour.toFixed(2)}/hr</span>
        </div>
      </div>
    </button>
  );
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customId, setCustomId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedModel = MODELS.find((m) => m.id === value);
  const isCustom = !selectedModel && value !== '';

  const filteredModels = MODELS.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.params.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target as Node)
    ) {
      setOpen(false);
      setSearchQuery('');
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search when dropdown opens
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, handleClickOutside]);

  const handleSelect = useCallback(
    (modelId: string) => {
      onChange(modelId);
      setOpen(false);
      setSearchQuery('');
      setCustomMode(false);
    },
    [onChange]
  );

  const handleCustomSubmit = useCallback(() => {
    const trimmed = customId.trim();
    if (trimmed) {
      onChange(trimmed);
      setOpen(false);
      setCustomMode(false);
      setCustomId('');
      setSearchQuery('');
    }
  }, [customId, onChange]);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-400">Model</label>
      <div className="relative" ref={dropdownRef}>
        {/* Selected model display */}
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={[
            'flex w-full items-center justify-between rounded-lg border bg-navy-800 px-3 py-2.5 text-left text-sm',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-1 focus:ring-offset-navy-900',
            open ? 'border-blue-500' : 'border-navy-700',
          ].join(' ')}
        >
          {selectedModel ? (
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-50">
                {selectedModel.name}
              </span>
              <TierBadge tier={selectedModel.tier} />
              <span className="text-xs text-slate-400">
                {selectedModel.params}
              </span>
            </div>
          ) : isCustom ? (
            <span className="font-mono text-sm text-slate-50">{value}</span>
          ) : (
            <span className="text-slate-500">Select a model...</span>
          )}
          <ChevronDown
            className={[
              'h-4 w-4 text-slate-400 transition-transform duration-150',
              open ? 'rotate-180' : '',
            ].join(' ')}
          />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-navy-700 bg-navy-800 shadow-xl">
            {/* Search */}
            <div className="border-b border-navy-700 px-3 py-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search models..."
                  className="w-full rounded border-0 bg-navy-900 py-1.5 pl-8 pr-3 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
              </div>
            </div>

            {/* Model list */}
            <div className="max-h-64 overflow-auto">
              {filteredModels.map((model) => (
                <ModelOptionRow
                  key={model.id}
                  model={model}
                  selected={model.id === value}
                  onSelect={() => handleSelect(model.id)}
                />
              ))}
              {filteredModels.length === 0 && (
                <div className="px-3 py-4 text-center text-sm text-slate-500">
                  No models match your search.
                </div>
              )}
            </div>

            {/* Custom model input */}
            <div className="border-t border-navy-700 px-3 py-2">
              {customMode ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customId}
                    onChange={(e) => setCustomId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCustomSubmit();
                      if (e.key === 'Escape') {
                        setCustomMode(false);
                        setCustomId('');
                      }
                    }}
                    placeholder="org/model-name"
                    className="flex-1 rounded border-0 bg-navy-900 px-2.5 py-1.5 font-mono text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleCustomSubmit}
                    disabled={!customId.trim()}
                    className="rounded bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition-colors duration-150 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Use
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomMode(false);
                      setCustomId('');
                    }}
                    className="rounded px-2 py-1.5 text-xs text-slate-400 transition-colors duration-150 hover:text-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCustomMode(true)}
                  className="w-full rounded px-2 py-1.5 text-left text-xs text-slate-400 transition-colors duration-150 hover:bg-navy-700 hover:text-slate-50"
                >
                  Use a custom HuggingFace model ID...
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected model details */}
      {selectedModel && (
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Cpu className="h-3 w-3" />
            {selectedModel.gpu}
          </span>
          <span>
            ${selectedModel.costPerHour.toFixed(2)}/hr estimated
          </span>
        </div>
      )}
    </div>
  );
}
