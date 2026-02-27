export interface QAPair {
  id: string;
  question: string;
  answer: string;
}

export interface EvalQuestion {
  id: string;
  question: string;
}

export type Optimizer = 'adamw' | 'sgd' | 'adafactor';
export type LRScheduler = 'cosine' | 'linear' | 'constant';

export interface Hyperparams {
  // Top-level (always visible)
  learning_rate: number;
  num_epochs: number;
  batch_size: number;
  lora_rank: number;
  lora_alpha: number;
  quantization: '4bit' | '8bit' | 'none';
  // Advanced
  lora_target_modules: string[];
  max_seq_length: number;
  warmup_ratio: number;
  weight_decay: number;
  gradient_accumulation_steps: number;
  lr_scheduler: LRScheduler;
  // Optimizer (nested inside Advanced)
  optimizer: Optimizer;
  beta1: number;
  beta2: number;
  epsilon: number;
  max_grad_norm: number;
}

export type InfluenceMethod = 'tracin' | 'datainf' | 'kronfluence';

export type ModelTier = 'small' | 'medium' | 'large' | 'xl';

export interface ModelInfo {
  id: string;
  name: string;
  params: string;
  tier: ModelTier;
  gpu: string;
  costPerHour: number;
}

export type JobStatus = 'queued' | 'starting' | 'training' | 'computing_influence' | 'completed' | 'failed';

export interface JobProgress {
  status: JobStatus;
  progress: number;
  current_epoch: number;
  total_epochs: number;
  training_loss: number;
  eta_seconds: number;
}

export interface EvalResult {
  eval_question: string;
  base_output: string;
  fewshot_output: string;
  finetuned_output: string;
}

export interface InfluenceMatrix {
  training_labels: string[];
  eval_labels: string[];
  scores: number[][];
}

export interface JobResults {
  eval_results: EvalResult[];
  influence: InfluenceMatrix;
  training_metadata: TrainingMetadata;
}

export interface TrainingMetadata {
  total_training_time_seconds: number;
  total_influence_time_seconds: number;
  peak_gpu_memory_gb: number;
  final_training_loss: number;
  loss_history: number[];
}

export interface Experiment {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  training_data: QAPair[];
  eval_data: EvalQuestion[];
  model_id: string;
  hyperparams: Hyperparams;
  influence_method: InfluenceMethod;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  user_id: string;
  experiment_id: string | null;
  status: JobStatus;
  progress: number;
  current_epoch: number | null;
  total_epochs: number | null;
  training_loss: number | null;
  config: TrainConfig;
  results: JobResults | null;
  training_metadata: TrainingMetadata | null;
  error: string | null;
  estimated_cost_usd: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface TrainConfig {
  model_id: string;
  training_data: QAPair[];
  eval_data: EvalQuestion[];
  hyperparams: Hyperparams;
  influence_method: InfluenceMethod;
  checkpoint_interval: number;
}

export interface TrainRequest {
  model_id: string;
  training_data: QAPair[];
  eval_data: EvalQuestion[];
  hyperparams: Hyperparams;
  influence_method: InfluenceMethod;
  checkpoint_interval: number;
  experiment_id?: string;
}

export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface ComputeSettings {
  runpod_key_last4: string | null;
  runpod_endpoint_id: string | null;
}
