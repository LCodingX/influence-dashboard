import { Zap, Scale, Microscope } from 'lucide-react';
import { INFLUENCE_METHODS } from '@/lib/constants';
import type { InfluenceMethod } from '@/lib/types';

interface InfluenceMethodSelectorProps {
  value: InfluenceMethod;
  onChange: (method: InfluenceMethod) => void;
}

const METHOD_ICONS: Record<InfluenceMethod, React.ReactNode> = {
  tracin: <Zap className="h-5 w-5" />,
  datainf: <Scale className="h-5 w-5" />,
  kronfluence: <Microscope className="h-5 w-5" />,
};

function CostIndicator({ multiplier }: { multiplier: number }) {
  return (
    <span className="font-mono text-xs text-slate-500">
      {multiplier}x compute
    </span>
  );
}

export function InfluenceMethodSelector({
  value,
  onChange,
}: InfluenceMethodSelectorProps) {
  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-slate-400">
        Influence method
      </label>
      <div className="flex flex-col gap-2">
        {INFLUENCE_METHODS.map((method) => {
          const isSelected = value === method.value;
          return (
            <button
              key={method.value}
              type="button"
              onClick={() => onChange(method.value)}
              className={[
                'flex items-start gap-3 rounded-lg border p-3 text-left',
                'transition-all duration-150',
                isSelected
                  ? 'border-blue-500 bg-blue-500/5'
                  : 'border-navy-700 hover:border-slate-500 hover:bg-navy-800',
              ].join(' ')}
            >
              <div
                className={[
                  'mt-0.5 flex-shrink-0',
                  isSelected ? 'text-blue-400' : 'text-slate-500',
                ].join(' ')}
              >
                {METHOD_ICONS[method.value]}
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span
                    className={[
                      'text-sm font-medium',
                      isSelected ? 'text-blue-400' : 'text-slate-50',
                    ].join(' ')}
                  >
                    {method.label}
                  </span>
                  <CostIndicator multiplier={method.costMultiplier} />
                </div>
                <p className="text-xs leading-relaxed text-slate-500">
                  {method.description}
                </p>
              </div>

              {/* Radio indicator */}
              <div className="mt-1 flex-shrink-0">
                <div
                  className={[
                    'h-4 w-4 rounded-full border-2',
                    'transition-colors duration-150',
                    isSelected
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-slate-500',
                  ].join(' ')}
                >
                  {isSelected && (
                    <div className="flex h-full w-full items-center justify-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
