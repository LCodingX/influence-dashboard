import { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Hyperparams, Optimizer, LRScheduler } from '@/lib/types';

interface HyperparamPanelProps {
  value: Hyperparams;
  onChange: (hyperparams: Hyperparams) => void;
}

interface NumberFieldProps {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  isMono?: boolean;
}

function NumberField({
  label,
  description,
  value,
  onChange,
  min,
  max,
  step = 1,
  isMono = false,
}: NumberFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-sm font-medium text-slate-50">{label}</label>
        <input
          type="number"
          value={value}
          onChange={(e) => {
            const parsed = parseFloat(e.target.value);
            if (!Number.isNaN(parsed)) {
              onChange(parsed);
            }
          }}
          min={min}
          max={max}
          step={step}
          className={[
            'w-28 rounded border border-navy-700 bg-navy-900 px-2.5 py-1.5 text-right text-sm text-slate-50',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500',
            isMono ? 'font-mono' : '',
          ].join(' ')}
        />
      </div>
      <p className="text-xs text-slate-500">{description}</p>
    </div>
  );
}

interface ToggleGroupProps<T extends string> {
  label: string;
  description: string;
  options: { value: T; label: string }[];
  selected: T;
  onChange: (value: T) => void;
}

function ToggleGroup<T extends string>({
  label,
  description,
  options,
  selected,
  onChange,
}: ToggleGroupProps<T>) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-slate-50">{label}</label>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              'rounded-lg border px-3 py-1.5 text-sm font-medium',
              'transition-colors duration-150',
              selected === opt.value
                ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                : 'border-navy-700 text-slate-400 hover:border-slate-500 hover:text-slate-50',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500">{description}</p>
    </div>
  );
}

interface CollapsibleSectionProps {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  nested?: boolean;
}

function CollapsibleSection({ label, open, onToggle, children, nested }: CollapsibleSectionProps) {
  return (
    <div className={nested ? 'border-t border-navy-700/50 pt-3' : 'border-t border-navy-700 pt-4'}>
      <button
        type="button"
        onClick={onToggle}
        className={[
          'flex w-full items-center gap-2 font-medium transition-colors duration-150 hover:text-slate-50',
          nested ? 'text-xs text-slate-500' : 'text-sm text-slate-400',
        ].join(' ')}
      >
        {open ? (
          <ChevronDown className={nested ? 'h-3 w-3' : 'h-4 w-4'} />
        ) : (
          <ChevronRight className={nested ? 'h-3 w-3' : 'h-4 w-4'} />
        )}
        {label}
      </button>
      {open && (
        <div className={`flex flex-col gap-4 ${nested ? 'mt-3' : 'mt-4'}`}>
          {children}
        </div>
      )}
    </div>
  );
}

export function HyperparamPanel({ value, onChange }: HyperparamPanelProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [optimizerOpen, setOptimizerOpen] = useState(false);

  const update = useCallback(
    <K extends keyof Hyperparams>(key: K, val: Hyperparams[K]) => {
      onChange({ ...value, [key]: val });
    },
    [value, onChange]
  );

  return (
    <div className="flex flex-col gap-5">
      <h3 className="text-sm font-semibold text-slate-50">Hyperparameters</h3>

      {/* ── Top-level: the knobs researchers actually turn ── */}
      <div className="flex flex-col gap-4">
        <NumberField
          label="Learning rate"
          description="Step size for gradient updates. Lower values train slower but more stably."
          value={value.learning_rate}
          onChange={(v) => update('learning_rate', v)}
          min={0}
          step={0.00001}
          isMono
        />
        <NumberField
          label="Epochs"
          description="Number of full passes over the training data."
          value={value.num_epochs}
          onChange={(v) => update('num_epochs', v)}
          min={1}
          max={500}
          step={1}
        />
        <NumberField
          label="Batch size"
          description="Number of training examples per gradient step."
          value={value.batch_size}
          onChange={(v) => update('batch_size', v)}
          min={1}
          max={128}
          step={1}
        />
        <NumberField
          label="LoRA rank"
          description="Rank of the low-rank adaptation matrices. Higher rank = more parameters."
          value={value.lora_rank}
          onChange={(v) => update('lora_rank', v)}
          min={1}
          max={256}
          step={1}
        />
        <NumberField
          label="LoRA alpha"
          description="Scaling factor for LoRA. Typically set to 2x the rank."
          value={value.lora_alpha}
          onChange={(v) => update('lora_alpha', v)}
          min={1}
          max={512}
          step={1}
        />
        <ToggleGroup
          label="Quantization"
          description="Lower precision reduces VRAM usage. 4-bit recommended for larger models."
          options={[
            { value: '4bit' as const, label: '4BIT' },
            { value: '8bit' as const, label: '8BIT' },
            { value: 'none' as const, label: 'None' },
          ]}
          selected={value.quantization}
          onChange={(v) => update('quantization', v)}
        />
      </div>

      {/* ── Advanced: useful occasionally, sensible defaults ── */}
      <CollapsibleSection
        label="Advanced"
        open={advancedOpen}
        onToggle={() => setAdvancedOpen((prev) => !prev)}
      >
        {/* LoRA target modules */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-50">
            LoRA target modules
          </label>
          <div className="flex flex-wrap gap-1.5">
            {['q_proj', 'k_proj', 'v_proj', 'o_proj', 'gate_proj', 'up_proj', 'down_proj'].map(
              (mod) => {
                const active = value.lora_target_modules.includes(mod);
                return (
                  <button
                    key={mod}
                    type="button"
                    onClick={() => {
                      const next = active
                        ? value.lora_target_modules.filter((m) => m !== mod)
                        : [...value.lora_target_modules, mod];
                      if (next.length > 0) {
                        update('lora_target_modules', next);
                      }
                    }}
                    className={[
                      'rounded border px-2 py-1 font-mono text-xs',
                      'transition-colors duration-150',
                      active
                        ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                        : 'border-navy-700 text-slate-500 hover:border-slate-500 hover:text-slate-400',
                    ].join(' ')}
                  >
                    {mod}
                  </button>
                );
              }
            )}
          </div>
          <p className="text-xs text-slate-500">
            Transformer layers to apply LoRA adapters to. More modules = more capacity but higher cost.
          </p>
        </div>

        <NumberField
          label="Max sequence length"
          description="Maximum number of tokens per training example."
          value={value.max_seq_length}
          onChange={(v) => update('max_seq_length', v)}
          min={64}
          max={8192}
          step={64}
        />
        <NumberField
          label="Warmup ratio"
          description="Fraction of training steps for learning rate warmup."
          value={value.warmup_ratio}
          onChange={(v) => update('warmup_ratio', v)}
          min={0}
          max={1}
          step={0.01}
          isMono
        />
        <NumberField
          label="Weight decay"
          description="L2 regularization strength. Helps prevent overfitting."
          value={value.weight_decay}
          onChange={(v) => update('weight_decay', v)}
          min={0}
          max={1}
          step={0.001}
          isMono
        />
        <NumberField
          label="Gradient accumulation steps"
          description="Simulate larger batch sizes by accumulating gradients over multiple forward passes."
          value={value.gradient_accumulation_steps}
          onChange={(v) => update('gradient_accumulation_steps', v)}
          min={1}
          max={64}
          step={1}
        />
        <ToggleGroup<LRScheduler>
          label="LR scheduler"
          description="How the learning rate changes during training. Cosine is usually best."
          options={[
            { value: 'cosine', label: 'Cosine' },
            { value: 'linear', label: 'Linear' },
            { value: 'constant', label: 'Constant' },
          ]}
          selected={value.lr_scheduler}
          onChange={(v) => update('lr_scheduler', v)}
        />

        {/* ── Optimizer: nested inside Advanced ── */}
        <CollapsibleSection
          label="Optimizer"
          open={optimizerOpen}
          onToggle={() => setOptimizerOpen((prev) => !prev)}
          nested
        >
          <ToggleGroup<Optimizer>
            label="Optimizer type"
            description="AdamW is standard for LoRA. SGD can be more stable for small datasets. Adafactor is memory-efficient."
            options={[
              { value: 'adamw', label: 'AdamW' },
              { value: 'sgd', label: 'SGD' },
              { value: 'adafactor', label: 'Adafactor' },
            ]}
            selected={value.optimizer}
            onChange={(v) => update('optimizer', v)}
          />

          {/* Beta1 / Momentum — shown for AdamW and SGD */}
          {value.optimizer !== 'adafactor' && (
            <NumberField
              label={value.optimizer === 'adamw' ? 'Beta1 (momentum)' : 'Momentum'}
              description={
                value.optimizer === 'adamw'
                  ? 'Exponential decay rate for the first moment estimate.'
                  : 'Momentum factor for SGD. Higher values smooth gradient updates.'
              }
              value={value.beta1}
              onChange={(v) => update('beta1', v)}
              min={0}
              max={0.999}
              step={0.01}
              isMono
            />
          )}

          {/* Beta2 — AdamW only */}
          {value.optimizer === 'adamw' && (
            <NumberField
              label="Beta2"
              description="Exponential decay rate for the second moment estimate."
              value={value.beta2}
              onChange={(v) => update('beta2', v)}
              min={0}
              max={0.9999}
              step={0.001}
              isMono
            />
          )}

          {/* Epsilon — AdamW and Adafactor */}
          {value.optimizer !== 'sgd' && (
            <NumberField
              label="Epsilon"
              description="Small constant for numerical stability in the optimizer denominator."
              value={value.epsilon}
              onChange={(v) => update('epsilon', v)}
              min={0}
              max={0.01}
              step={1e-9}
              isMono
            />
          )}

          <NumberField
            label="Gradient clipping max norm"
            description="Clip gradients whose norm exceeds this value. Prevents exploding gradients."
            value={value.max_grad_norm}
            onChange={(v) => update('max_grad_norm', v)}
            min={0}
            max={10}
            step={0.1}
            isMono
          />
        </CollapsibleSection>
      </CollapsibleSection>
    </div>
  );
}
