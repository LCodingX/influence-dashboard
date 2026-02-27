import { useState, useEffect, useRef, useCallback } from 'react';
import { apiCall } from '@/lib/api';
import type { JobLogEntry, JobStatus } from '@/lib/types';

interface UseJobLogsReturn {
  logs: JobLogEntry[];
  loading: boolean;
  error: string | null;
}

const POLL_INTERVAL_MS = 3000;

export function useJobLogs(
  jobId: string | null,
  jobStatus: JobStatus | null
): UseJobLogsReturn {
  const [logs, setLogs] = useState<JobLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const afterSeqRef = useRef(0);
  const didFinalFetchRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const fetchLogs = useCallback(async (id: string) => {
    try {
      const entries = await apiCall<JobLogEntry[]>(
        `/api/logs?job_id=${encodeURIComponent(id)}&after_seq=${afterSeqRef.current}`
      );
      if (entries.length > 0) {
        setLogs((prev) => [...prev, ...entries]);
        afterSeqRef.current = Math.max(
          afterSeqRef.current,
          ...entries.map((e) => e.seq)
        );
      }
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch logs';
      setError(message);
    }
  }, []);

  // Reset when jobId changes
  useEffect(() => {
    stopPolling();
    setLogs([]);
    setError(null);
    afterSeqRef.current = 0;
    didFinalFetchRef.current = false;

    if (!jobId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    void fetchLogs(jobId).then(() => setLoading(false));

    intervalRef.current = setInterval(() => {
      void fetchLogs(jobId);
    }, POLL_INTERVAL_MS);

    return stopPolling;
  }, [jobId, fetchLogs, stopPolling]);

  // Stop polling on terminal status (after one final fetch)
  useEffect(() => {
    if (
      jobId &&
      (jobStatus === 'completed' || jobStatus === 'failed') &&
      !didFinalFetchRef.current
    ) {
      didFinalFetchRef.current = true;
      // Do one final fetch then stop
      void fetchLogs(jobId).then(() => {
        stopPolling();
      });
    }
  }, [jobId, jobStatus, fetchLogs, stopPolling]);

  return { logs, loading, error };
}
