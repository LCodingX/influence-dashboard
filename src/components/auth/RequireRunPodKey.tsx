import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useComputeBackend } from '@/hooks/useComputeBackend';

export function RequireRunPodKey() {
  const { settings, loading } = useComputeBackend();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy-900">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!settings?.runpod_key_last4) {
    return <Navigate to="/setup" replace />;
  }

  return <Outlet />;
}
