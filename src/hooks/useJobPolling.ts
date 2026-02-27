import { useState, useEffect, useRef, useCallback } from 'react';
import { apiCall } from '@/lib/api';
import type { Job } from '@/lib/types';

interface UseJobPollingReturn {
  job: Job | null;
  loading: boolean;
  error: string | null;
}

const POLL_INTERVAL_MS = 3000;

export function useJobPolling(jobId: string | null): UseJobPollingReturn {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const fetchStatus = useCallback(async (id: string) => {
    try {
      const result = await apiCall<Job>(`/api/status?job_id=${encodeURIComponent(id)}`);
      setJob(result);
      setError(null);

      if (result.status === 'completed' || result.status === 'failed') {
        stopPolling();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch job status';
      setError(message);
      stopPolling();
    }
  }, [stopPolling]);

  useEffect(() => {
    stopPolling();
    setJob(null);
    setError(null);

    if (!jobId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    void fetchStatus(jobId).then(() => setLoading(false));

    intervalRef.current = setInterval(() => {
      void fetchStatus(jobId);
    }, POLL_INTERVAL_MS);

    return stopPolling;
  }, [jobId, fetchStatus, stopPolling]);

  return { job, loading, error };
}
