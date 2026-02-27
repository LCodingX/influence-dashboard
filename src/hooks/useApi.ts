import { useState, useCallback } from 'react';
import { apiCall } from '@/lib/api';

interface UseApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (path: string, options?: RequestInit) => Promise<T | null>;
}

export function useApi<T>(): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    error: null,
    loading: false,
  });

  const execute = useCallback(async (path: string, options?: RequestInit): Promise<T | null> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await apiCall<T>(path, options);
      setState({ data, error: null, loading: false });
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setState((prev) => ({ ...prev, error: message, loading: false }));
      return null;
    }
  }, []);

  return { ...state, execute };
}
