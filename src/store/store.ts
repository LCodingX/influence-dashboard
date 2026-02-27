import { create } from 'zustand';
import type {
  QAPair,
  EvalQuestion,
  Hyperparams,
  InfluenceMethod,
  Experiment,
} from '@/lib/types';
import { MODELS, DEFAULT_HYPERPARAMS, DEFAULT_CHECKPOINT_INTERVAL } from '@/lib/constants';

interface DashboardState {
  trainingData: QAPair[];
  evalData: EvalQuestion[];
  modelId: string;
  hyperparams: Hyperparams;
  influenceMethod: InfluenceMethod;
  checkpointInterval: number;
  activeJobId: string | null;
  selectedExperimentId: string | null;

  setTrainingData: (data: QAPair[]) => void;
  addTrainingPair: (pair: QAPair) => void;
  removeTrainingPair: (id: string) => void;
  updateTrainingPair: (id: string, updates: Partial<Omit<QAPair, 'id'>>) => void;

  setEvalData: (data: EvalQuestion[]) => void;
  addEvalQuestion: (question: EvalQuestion) => void;
  removeEvalQuestion: (id: string) => void;
  updateEvalQuestion: (id: string, updates: Partial<Omit<EvalQuestion, 'id'>>) => void;

  setModelId: (id: string) => void;
  setHyperparams: (params: Hyperparams) => void;
  setInfluenceMethod: (method: InfluenceMethod) => void;
  setCheckpointInterval: (interval: number) => void;
  setActiveJobId: (id: string | null) => void;
  setSelectedExperimentId: (id: string | null) => void;

  loadExperiment: (experiment: Experiment) => void;
  reset: () => void;
}

const initialState = {
  trainingData: [] as QAPair[],
  evalData: [] as EvalQuestion[],
  modelId: MODELS[0].id,
  hyperparams: { ...DEFAULT_HYPERPARAMS },
  influenceMethod: 'tracin' as InfluenceMethod,
  checkpointInterval: DEFAULT_CHECKPOINT_INTERVAL,
  activeJobId: null as string | null,
  selectedExperimentId: null as string | null,
};

export const useDashboardStore = create<DashboardState>((set) => ({
  ...initialState,

  setTrainingData: (data) => set({ trainingData: data }),

  addTrainingPair: (pair) =>
    set((state) => ({ trainingData: [...state.trainingData, pair] })),

  removeTrainingPair: (id) =>
    set((state) => ({
      trainingData: state.trainingData.filter((p) => p.id !== id),
    })),

  updateTrainingPair: (id, updates) =>
    set((state) => ({
      trainingData: state.trainingData.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),

  setEvalData: (data) => set({ evalData: data }),

  addEvalQuestion: (question) =>
    set((state) => ({ evalData: [...state.evalData, question] })),

  removeEvalQuestion: (id) =>
    set((state) => ({
      evalData: state.evalData.filter((q) => q.id !== id),
    })),

  updateEvalQuestion: (id, updates) =>
    set((state) => ({
      evalData: state.evalData.map((q) =>
        q.id === id ? { ...q, ...updates } : q
      ),
    })),

  setModelId: (id) => set({ modelId: id }),
  setHyperparams: (params) => set({ hyperparams: params }),
  setInfluenceMethod: (method) => set({ influenceMethod: method }),
  setCheckpointInterval: (interval) => set({ checkpointInterval: interval }),
  setActiveJobId: (id) => set({ activeJobId: id }),
  setSelectedExperimentId: (id) => set({ selectedExperimentId: id }),

  loadExperiment: (experiment) =>
    set({
      trainingData: experiment.training_data,
      evalData: experiment.eval_data,
      modelId: experiment.model_id,
      hyperparams: experiment.hyperparams,
      influenceMethod: experiment.influence_method,
      selectedExperimentId: experiment.id,
    }),

  reset: () => set({ ...initialState, hyperparams: { ...DEFAULT_HYPERPARAMS } }),
}));
