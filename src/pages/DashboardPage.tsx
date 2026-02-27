import { useState, useCallback } from 'react';
import { Play, Save } from 'lucide-react';
import { useDashboardStore } from '@/store/store';
import { useAuth } from '@/hooks/useAuth';
import { useJobPolling } from '@/hooks/useJobPolling';
import { useInfluenceData } from '@/hooks/useInfluenceData';
import { apiCall } from '@/lib/api';
import { validateTrainingData, validateEvalData, validateModelId } from '@/lib/validation';
import type { TrainRequest } from '@/lib/types';

import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { PanelLayout } from '@/components/layout/PanelLayout';
import { TrainingPanel } from '@/components/training/TrainingPanel';
import { EvaluationPanel } from '@/components/evaluation/EvaluationPanel';
import { ResultsComparison } from '@/components/evaluation/ResultsComparison';
import { ModelSelector } from '@/components/config/ModelSelector';
import { HyperparamPanel } from '@/components/config/HyperparamPanel';
import { InfluenceMethodSelector } from '@/components/config/InfluenceMethodSelector';
import { CostEstimator } from '@/components/jobs/CostEstimator';
import { JobStatus } from '@/components/jobs/JobStatus';
import { InfluenceHeatmap } from '@/components/influence/InfluenceHeatmap';
import { InfluenceDetail } from '@/components/influence/InfluenceDetail';
import { InfluenceSummary } from '@/components/influence/InfluenceSummary';
import { SaveExperimentDialog } from '@/components/experiments/SaveExperimentDialog';
import { Button } from '@/components/ui/Button';

export function DashboardPage() {
  const { user, signOut } = useAuth();

  const trainingData = useDashboardStore((s) => s.trainingData);
  const evalData = useDashboardStore((s) => s.evalData);
  const modelId = useDashboardStore((s) => s.modelId);
  const hyperparams = useDashboardStore((s) => s.hyperparams);
  const influenceMethod = useDashboardStore((s) => s.influenceMethod);
  const checkpointInterval = useDashboardStore((s) => s.checkpointInterval);
  const activeJobId = useDashboardStore((s) => s.activeJobId);

  const setTrainingData = useDashboardStore((s) => s.setTrainingData);
  const setEvalData = useDashboardStore((s) => s.setEvalData);
  const setModelId = useDashboardStore((s) => s.setModelId);
  const setHyperparams = useDashboardStore((s) => s.setHyperparams);
  const setInfluenceMethod = useDashboardStore((s) => s.setInfluenceMethod);
  const setActiveJobId = useDashboardStore((s) => s.setActiveJobId);

  const { job } = useJobPolling(activeJobId);
  const { results } = useInfluenceData(activeJobId, job?.status ?? null);

  const [trainError, setTrainError] = useState<string | null>(null);
  const [training, setTraining] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [savingExperiment, setSavingExperiment] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [selectedCell, setSelectedCell] = useState<{
    trainIdx: number;
    evalIdx: number;
  } | null>(null);

  const handleTrain = useCallback(async () => {
    setTrainError(null);

    const trainingErrors = validateTrainingData(trainingData);
    const evalErrors = validateEvalData(evalData);
    const modelErrors = validateModelId(modelId);
    const allErrors = [...trainingErrors, ...evalErrors, ...modelErrors];

    if (allErrors.length > 0) {
      setTrainError(allErrors.map((e) => e.message).join('. '));
      return;
    }

    setTraining(true);
    try {
      const payload: TrainRequest = {
        model_id: modelId,
        training_data: trainingData,
        eval_data: evalData,
        hyperparams,
        influence_method: influenceMethod,
        checkpoint_interval: checkpointInterval,
      };
      const res = await apiCall<{ job_id: string }>('/api/train', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setActiveJobId(res.job_id);
    } catch (err) {
      setTrainError(err instanceof Error ? err.message : 'Failed to start training');
    } finally {
      setTraining(false);
    }
  }, [trainingData, evalData, modelId, hyperparams, influenceMethod, checkpointInterval, setActiveJobId]);

  const handleSaveExperiment = useCallback(
    async (name: string, description: string) => {
      setSavingExperiment(true);
      setSaveError(null);
      try {
        await apiCall('/api/experiments', {
          method: 'POST',
          body: JSON.stringify({
            name,
            description: description || null,
            training_data: trainingData,
            eval_data: evalData,
            model_id: modelId,
            hyperparams,
            influence_method: influenceMethod,
          }),
        });
        setSaveDialogOpen(false);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Failed to save experiment');
      } finally {
        setSavingExperiment(false);
      }
    },
    [trainingData, evalData, modelId, hyperparams, influenceMethod]
  );

  const handleCellClick = useCallback((trainIdx: number, evalIdx: number) => {
    setSelectedCell({ trainIdx, evalIdx });
  }, []);

  const isJobActive =
    job !== null &&
    job.status !== 'completed' &&
    job.status !== 'failed';

  const leftPanel = (
    <div className="flex flex-col gap-6">
      <EvaluationPanel questions={evalData} onChange={setEvalData} />
      <ResultsComparison results={results?.eval_results ?? null} />
    </div>
  );

  const rightPanel = (
    <div className="flex flex-col gap-6">
      {/* Action buttons at the top */}
      <div className="flex gap-3">
        <Button
          variant="primary"
          icon={<Play className="h-4 w-4" />}
          onClick={handleTrain}
          loading={training || isJobActive}
          disabled={training || isJobActive}
        >
          {isJobActive ? 'Training...' : 'Train & Compute Influence'}
        </Button>
        <Button
          variant="secondary"
          icon={<Save className="h-4 w-4" />}
          onClick={() => setSaveDialogOpen(true)}
        >
          Save Experiment
        </Button>
      </div>

      {trainError && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {trainError}
        </div>
      )}

      {job && <JobStatus job={job} />}

      <TrainingPanel pairs={trainingData} onChange={setTrainingData} />

      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Configuration
        </h2>
        <ModelSelector value={modelId} onChange={setModelId} />
        <HyperparamPanel value={hyperparams} onChange={setHyperparams} />
        <InfluenceMethodSelector
          value={influenceMethod}
          onChange={setInfluenceMethod}
        />
      </div>

      <CostEstimator
        modelId={modelId}
        hyperparams={hyperparams}
        influenceMethod={influenceMethod}
        numTrainingExamples={trainingData.length}
        numEvalExamples={evalData.length}
      />
    </div>
  );

  const bottomPanel = (
    <div className="space-y-6">
      {selectedCell && results?.influence ? (
        <InfluenceDetail
          matrix={results.influence}
          trainIndex={selectedCell.trainIdx}
          evalIndex={selectedCell.evalIdx}
          onClose={() => setSelectedCell(null)}
        />
      ) : null}
      <div className="flex gap-6">
        <div className="flex-1">
          <InfluenceHeatmap
            data={results?.influence ?? null}
            onCellClick={handleCellClick}
          />
        </div>
        <div className="w-80 flex-shrink-0">
          <InfluenceSummary data={results?.influence ?? null} />
        </div>
      </div>
    </div>
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
        <main className="flex-1 overflow-hidden ml-56">
          <PanelLayout
            leftPanel={leftPanel}
            rightPanel={rightPanel}
            bottomPanel={bottomPanel}
          />
        </main>
      </div>

      <SaveExperimentDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        onSave={handleSaveExperiment}
        saving={savingExperiment}
        error={saveError}
      />
    </div>
  );
}
