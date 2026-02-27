import { useState, useEffect } from 'react';
import { apiCall } from '@/lib/api';
import type { JobResults, JobStatus } from '@/lib/types';

interface UseInfluenceDataReturn {
  results: JobResults | null;
  loading: boolean;
  error: string | null;
}

export function useInfluenceData(
  jobId: string | null,
  jobStatus: JobStatus | null
): UseInfluenceDataReturn {
  const [results, setResults] = useState<JobResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId || jobStatus !== 'completed') {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    apiCall<JobResults>(`/api/results?job_id=${encodeURIComponent(jobId)}`)
      .then((data) => {
        if (!cancelled) {
          setResults(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to fetch results';
          setError(message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [jobId, jobStatus]);

  return { results, loading, error };
}
