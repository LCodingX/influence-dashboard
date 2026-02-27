import { useState, useEffect, useCallback } from 'react';
import { apiCall } from '@/lib/api';
import type { Experiment } from '@/lib/types';

interface CreateExperimentPayload {
  name: string;
  description: string | null;
  training_data: Experiment['training_data'];
  eval_data: Experiment['eval_data'];
  model_id: string;
  hyperparams: Experiment['hyperparams'];
  influence_method: Experiment['influence_method'];
}

interface UseExperimentsReturn {
  experiments: Experiment[];
  loading: boolean;
  error: string | null;
  createExperiment: (payload: CreateExperimentPayload) => Promise<Experiment | null>;
  deleteExperiment: (id: string) => Promise<boolean>;
  loadExperiment: (id: string) => Promise<Experiment | null>;
  refresh: () => Promise<void>;
}

export function useExperiments(): UseExperimentsReturn {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExperiments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall<Experiment[]>('/api/experiments');
      setExperiments(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load experiments';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchExperiments();
  }, [fetchExperiments]);

  const createExperiment = useCallback(
    async (payload: CreateExperimentPayload): Promise<Experiment | null> => {
      try {
        const experiment = await apiCall<Experiment>('/api/experiments', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setExperiments((prev) => [experiment, ...prev]);
        return experiment;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create experiment';
        setError(message);
        return null;
      }
    },
    []
  );

  const deleteExperiment = useCallback(async (id: string): Promise<boolean> => {
    try {
      await apiCall<{ success: boolean }>(`/api/experiments?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      setExperiments((prev) => prev.filter((e) => e.id !== id));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete experiment';
      setError(message);
      return false;
    }
  }, []);

  const loadExperiment = useCallback(async (id: string): Promise<Experiment | null> => {
    try {
      const experiment = await apiCall<Experiment>(
        `/api/experiments?id=${encodeURIComponent(id)}`
      );
      return experiment;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load experiment';
      setError(message);
      return null;
    }
  }, []);

  return {
    experiments,
    loading,
    error,
    createExperiment,
    deleteExperiment,
    loadExperiment,
    refresh: fetchExperiments,
  };
}
