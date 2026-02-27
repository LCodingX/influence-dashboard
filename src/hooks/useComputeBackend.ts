import { useState, useEffect, useCallback, useRef } from 'react';
import { apiCall } from '@/lib/api';
import type { ComputeSettings } from '@/lib/types';

interface UseComputeBackendReturn {
  settings: ComputeSettings | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useComputeBackend(): UseComputeBackendReturn {
  const [settings, setSettings] = useState<ComputeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall<ComputeSettings>('/api/settings/runpod-key');
      setSettings(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load compute settings';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchSettings();
    }
  }, [fetchSettings]);

  const refresh = useCallback(() => {
    fetchedRef.current = false;
    fetchSettings();
  }, [fetchSettings]);

  return { settings, loading, error, refresh };
}
