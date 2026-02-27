import { useState, useCallback } from 'react';
import {
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  Trash2,
  Loader2,
  ExternalLink,
  Shield,
  AlertCircle,
} from 'lucide-react';
import { apiCall } from '@/lib/api';
import type { ComputeSettings } from '@/lib/types';

interface BackendConfigProps {
  settings: ComputeSettings | null;
  loading: boolean;
  onRefresh: () => void;
}

interface SaveKeyResponse {
  success: boolean;
  last4: string;
  endpoint_id: string | null;
}

interface RemoveKeyResponse {
  success: boolean;
}

export function BackendConfig({ settings, loading, onRefresh }: BackendConfigProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const hasKey = settings?.runpod_key_last4 != null;
  const hasEndpoint = settings?.runpod_endpoint_id != null;

  const handleSaveKey = useCallback(async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await apiCall<SaveKeyResponse>('/api/settings/runpod-key', {
        method: 'POST',
        body: JSON.stringify({ api_key: apiKey.trim() }),
      });
      setApiKey('');
      setShowKey(false);
      onRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save API key';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  }, [apiKey, onRefresh]);

  const handleRemoveKey = useCallback(async () => {
    setRemoving(true);
    setSaveError(null);
    try {
      await apiCall<RemoveKeyResponse>('/api/settings/runpod-key', {
        method: 'DELETE',
      });
      onRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove API key';
      setSaveError(message);
    } finally {
      setRemoving(false);
    }
  }, [onRefresh]);

  return (
    <div className="rounded-lg border border-navy-700 bg-navy-800 p-6">
      <div className="flex items-center gap-2">
        <Key className="h-4 w-4 text-slate-300" />
        <h2 className="text-sm font-medium text-slate-50">RunPod API Key</h2>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        Your RunPod API key is used to run training and influence computation jobs on serverless GPUs.
      </p>

      <div className="mt-4 space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading settings...
          </div>
        ) : hasKey ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                <span className="text-sm text-slate-200">
                  Key saved:{' '}
                  <span className="font-mono text-xs text-slate-400">
                    ****{settings?.runpod_key_last4}
                  </span>
                </span>
              </div>
              <button
                type="button"
                onClick={handleRemoveKey}
                disabled={removing}
                className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-rose-400 transition-colors duration-150 hover:bg-rose-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {removing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                Remove Key
              </button>
            </div>

            <div className="flex items-center gap-2">
              {hasEndpoint ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-xs text-slate-300">Endpoint ready</span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {settings?.runpod_endpoint_id}
                  </span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-slate-500" />
                  <span className="text-xs text-slate-400">
                    Endpoint will be created on first job.
                  </span>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setSaveError(null);
                }}
                placeholder="rp_xxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full rounded-lg border border-navy-700 bg-navy-900 py-2.5 pl-3 pr-10 font-mono text-sm text-slate-50 placeholder:text-slate-500 transition-colors duration-150 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowKey((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors duration-150 hover:text-slate-300"
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={handleSaveKey}
              disabled={saving || !apiKey.trim()}
              className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save &amp; Verify
            </button>
          </div>
        )}

        {saveError && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2.5">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-rose-400" />
            <span className="text-xs text-rose-300">{saveError}</span>
          </div>
        )}

        <div className="flex items-start gap-2 text-[11px] text-slate-500">
          <Shield className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <span>
            Your API key is encrypted at rest and only used to manage serverless
            endpoints and submit training jobs.
          </span>
        </div>

        <a
          href="https://runpod.io"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-400 transition-colors duration-150 hover:text-blue-300"
        >
          Don&apos;t have a RunPod account? Sign up at runpod.io
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
