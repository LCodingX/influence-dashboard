import type { ModelInfo, ModelTier, Hyperparams, InfluenceMethod, RunPodGpuId } from './types';

export const MODELS: ModelInfo[] = [
  { id: 'google/gemma-3-1b-it', name: 'Gemma 3 1B', params: '1B', tier: 'small', gpu: 'A10 24GB', costPerHour: 1.12 },
  { id: 'meta-llama/Llama-3.2-3B', name: 'Llama 3.2 3B', params: '3B', tier: 'small', gpu: 'A10 24GB', costPerHour: 1.12 },
  { id: 'microsoft/phi-4-mini', name: 'Phi-4 Mini', params: '3.8B', tier: 'small', gpu: 'A10 24GB', costPerHour: 1.12 },
  { id: 'google/gemma-3-12b-it', name: 'Gemma 3 12B', params: '12B', tier: 'medium', gpu: 'L40S 48GB', costPerHour: 2.48 },
  { id: 'meta-llama/Llama-3.1-8B', name: 'Llama 3.1 8B', params: '8B', tier: 'medium', gpu: 'L40S 48GB', costPerHour: 2.48 },
  { id: 'mistralai/Mistral-7B-v0.3', name: 'Mistral 7B', params: '7B', tier: 'medium', gpu: 'L40S 48GB', costPerHour: 2.48 },
  { id: 'meta-llama/Llama-3.3-33B', name: 'Llama 3.3 33B', params: '33B', tier: 'large', gpu: 'A100 80GB', costPerHour: 5.00 },
  { id: 'Qwen/Qwen2.5-32B', name: 'Qwen 2.5 32B', params: '32B', tier: 'large', gpu: 'A100 80GB', costPerHour: 5.00 },
  { id: 'meta-llama/Llama-3.1-70B', name: 'Llama 3.1 70B', params: '70B', tier: 'xl', gpu: 'A100 80GB', costPerHour: 5.00 },
  { id: 'Qwen/Qwen2.5-72B', name: 'Qwen 2.5 72B', params: '72B', tier: 'xl', gpu: 'A100 80GB', costPerHour: 5.00 },
];

export const DEFAULT_HYPERPARAMS: Hyperparams = {
  learning_rate: 2e-5,
  num_epochs: 50,
  batch_size: 4,
  lora_rank: 16,
  lora_alpha: 32,
  quantization: '4bit',
  lora_target_modules: ['q_proj', 'v_proj'],
  max_seq_length: 512,
  warmup_ratio: 0.1,
  weight_decay: 0.01,
  gradient_accumulation_steps: 1,
  lr_scheduler: 'cosine',
  optimizer: 'adamw',
  beta1: 0.9,
  beta2: 0.999,
  epsilon: 1e-8,
  max_grad_norm: 1.0,
};

export const INFLUENCE_METHODS: { value: InfluenceMethod; label: string; description: string; costMultiplier: number }[] = [
  {
    value: 'tracin',
    label: 'TracIn',
    description: 'Fast checkpoint-based influence. Saves gradients at periodic checkpoints during training.',
    costMultiplier: 1.0,
  },
  {
    value: 'datainf',
    label: 'DataInf',
    description: 'Balanced accuracy. Computes closed-form influence using per-example LoRA gradients.',
    costMultiplier: 1.5,
  },
  {
    value: 'kronfluence',
    label: 'Kronfluence',
    description: 'Highest quality. Kronecker-factored approximate curvature (EK-FAC) of the Fisher.',
    costMultiplier: 2.5,
  },
];

export const TIER_BADGES: Record<string, { label: string; color: string }> = {
  small: { label: 'Small', color: 'bg-emerald-500/20 text-emerald-400' },
  medium: { label: 'Medium', color: 'bg-blue-500/20 text-blue-400' },
  large: { label: 'Large', color: 'bg-amber-500/20 text-amber-400' },
  xl: { label: 'XL', color: 'bg-rose-500/20 text-rose-400' },
};

export const DEFAULT_CHECKPOINT_INTERVAL = 10;

export const GPU_TYPES: { id: RunPodGpuId; label: string; vram: string; costPerHour: number }[] = [
  { id: 'AMPERE_16', label: 'A10 24GB', vram: '24 GB', costPerHour: 1.12 },
  { id: 'AMPERE_48', label: 'L40S 48GB', vram: '48 GB', costPerHour: 2.48 },
  { id: 'AMPERE_80', label: 'A100 80GB', vram: '80 GB', costPerHour: 5.00 },
];

export const TIER_COMPATIBLE_GPUS: Record<ModelTier, RunPodGpuId[]> = {
  small: ['AMPERE_16', 'AMPERE_48', 'AMPERE_80'],
  medium: ['AMPERE_48', 'AMPERE_80'],
  large: ['AMPERE_80'],
  xl: ['AMPERE_80'],
};
