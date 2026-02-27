import type { Hyperparams, InfluenceMethod, ModelTier } from './types';
import { MODELS, INFLUENCE_METHODS } from './constants';

interface CostEstimate {
  trainingCost: number;
  influenceCost: number;
  totalCost: number;
  estimatedTimeMinutes: number;
}

/** RunPod serverless GPU pricing (per hour) */
const RUNPOD_GPU_PRICING: Record<string, number> = {
  'A10 24GB': 1.12,
  'L40S 48GB': 2.48,
  'A100 80GB': 5.00,
};

function getGpuCostPerHour(model: { gpu: string; costPerHour: number } | undefined): number {
  if (!model) {
    return 2.48;
  }
  return RUNPOD_GPU_PRICING[model.gpu] ?? model.costPerHour;
}

function getBaseTrainingTimeMinutes(tier: ModelTier, numEpochs: number, numExamples: number): number {
  const perEpochMinutes: Record<ModelTier, number> = {
    small: 0.02,
    medium: 0.05,
    large: 0.12,
    xl: 0.25,
  };
  return perEpochMinutes[tier] * numEpochs * Math.max(1, numExamples / 4);
}

export function estimateCost(
  modelId: string,
  hyperparams: Hyperparams,
  influenceMethod: InfluenceMethod,
  numTrainingExamples: number,
  numEvalExamples: number
): CostEstimate {
  const model = MODELS.find((m) => m.id === modelId);
  const costPerHour = getGpuCostPerHour(model);
  const tier = model?.tier ?? 'medium';

  const trainingMinutes = getBaseTrainingTimeMinutes(tier, hyperparams.num_epochs, numTrainingExamples);
  const trainingCost = (trainingMinutes / 60) * costPerHour;

  const influenceMultiplier = INFLUENCE_METHODS.find((m) => m.value === influenceMethod)?.costMultiplier ?? 1;
  const influenceMinutes = trainingMinutes * 0.3 * influenceMultiplier * (numEvalExamples / Math.max(1, numTrainingExamples));
  const influenceCost = (influenceMinutes / 60) * costPerHour;

  return {
    trainingCost: Math.round(trainingCost * 100) / 100,
    influenceCost: Math.round(influenceCost * 100) / 100,
    totalCost: Math.round((trainingCost + influenceCost) * 100) / 100,
    estimatedTimeMinutes: Math.round(trainingMinutes + influenceMinutes),
  };
}

/** Get RunPod hourly rate for a given GPU string */
export function getRunpodHourlyRate(gpu: string): number {
  return RUNPOD_GPU_PRICING[gpu] ?? 2.48;
}
