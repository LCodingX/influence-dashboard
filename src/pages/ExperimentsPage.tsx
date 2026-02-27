import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useExperiments } from '@/hooks/useExperiments';
import { useDashboardStore } from '@/store/store';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { ExperimentList } from '@/components/experiments/ExperimentList';
import type { Experiment } from '@/lib/types';

export function ExperimentsPage() {
  const { user, signOut } = useAuth();
  const { experiments, loading, deleteExperiment, refresh } = useExperiments();
  const loadExperiment = useDashboardStore((s) => s.loadExperiment);
  const navigate = useNavigate();

  const handleSelect = useCallback(
    (experiment: Experiment) => {
      loadExperiment(experiment);
      navigate('/');
    },
    [loadExperiment, navigate]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteExperiment(id);
      await refresh();
    },
    [deleteExperiment, refresh]
  );

  return (
    <div className="flex h-screen flex-col bg-navy-900">
      <Header
        user={{
          display_name: user?.user_metadata?.full_name ?? user?.email ?? null,
          avatar_url: user?.user_metadata?.avatar_url ?? null,
        }}
        onSignOut={signOut}
      />

      <div className="flex flex-1 overflow-hidden pt-14">
        <Sidebar />
        <main className="flex-1 overflow-auto ml-56 p-6">
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-slate-50">Experiments</h1>
            <p className="mt-1 text-sm text-slate-400">
              Your saved experiment configurations. Click to load one into the dashboard.
            </p>
          </div>
          <ExperimentList
            experiments={experiments}
            onSelect={handleSelect}
            onDelete={handleDelete}
            loading={loading}
          />
        </main>
      </div>
    </div>
  );
}
