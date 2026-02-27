import type { QAPair, EvalQuestion, Hyperparams } from './types';

export interface ValidationError {
  field: string;
  message: string;
}

export function validateTrainingData(data: QAPair[]): ValidationError[] {
  const errors: ValidationError[] = [];
  if (data.length === 0) {
    errors.push({ field: 'training_data', message: 'At least one training example is required' });
  }
  data.forEach((pair, i) => {
    if (!pair.question.trim()) {
      errors.push({ field: `training_data[${i}].question`, message: `Training example ${i + 1}: question is empty` });
    }
    if (!pair.answer.trim()) {
      errors.push({ field: `training_data[${i}].answer`, message: `Training example ${i + 1}: answer is empty` });
    }
  });
  return errors;
}

export function validateEvalData(data: EvalQuestion[]): ValidationError[] {
  const errors: ValidationError[] = [];
  if (data.length === 0) {
    errors.push({ field: 'eval_data', message: 'At least one evaluation question is required' });
  }
  data.forEach((q, i) => {
    if (!q.question.trim()) {
      errors.push({ field: `eval_data[${i}].question`, message: `Evaluation question ${i + 1} is empty` });
    }
  });
  return errors;
}

export function validateHyperparams(params: Hyperparams): ValidationError[] {
  const errors: ValidationError[] = [];
  if (params.learning_rate <= 0 || params.learning_rate > 0.1) {
    errors.push({ field: 'learning_rate', message: 'Learning rate must be between 0 and 0.1' });
  }
  if (params.num_epochs < 1 || params.num_epochs > 500) {
    errors.push({ field: 'num_epochs', message: 'Epochs must be between 1 and 500' });
  }
  if (params.batch_size < 1 || params.batch_size > 64) {
    errors.push({ field: 'batch_size', message: 'Batch size must be between 1 and 64' });
  }
  if (![4, 8, 16, 32, 64].includes(params.lora_rank)) {
    errors.push({ field: 'lora_rank', message: 'LoRA rank must be 4, 8, 16, 32, or 64' });
  }
  if (params.max_seq_length < 64 || params.max_seq_length > 4096) {
    errors.push({ field: 'max_seq_length', message: 'Max sequence length must be between 64 and 4096' });
  }
  return errors;
}

export function validateModelId(modelId: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!modelId.trim()) {
    errors.push({ field: 'model_id', message: 'Model is required' });
  }
  return errors;
}
