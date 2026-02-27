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

interface HuggingFaceConfigProps {
  settings: ComputeSettings | null;
  loading: boolean;
  onRefresh: () => void;
}

export function HuggingFaceConfig({ settings, loading, onRefresh }: HuggingFaceConfigProps) {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const hasToken = settings?.hf_token_last4 != null;

  const handleSaveToken = useCallback(async () => {
    if (!token.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await apiCall<{ hf_token_last4: string }>('/api/settings/hf-token', {
        method: 'POST',
        body: JSON.stringify({ token: token.trim() }),
      });
      setToken('');
      setShowToken(false);
      onRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save token';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  }, [token, onRefresh]);

  const handleRemoveToken = useCallback(async () => {
    setRemoving(true);
    setSaveError(null);
    try {
      await apiCall<{ hf_token_last4: null }>('/api/settings/hf-token', {
        method: 'DELETE',
      });
      onRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove token';
      setSaveError(message);
    } finally {
      setRemoving(false);
    }
  }, [onRefresh]);

  return (
    <div className="rounded-lg border border-navy-700 bg-navy-800 p-6">
      <div className="flex items-center gap-2">
        <Key className="h-4 w-4 text-slate-300" />
        <h2 className="text-sm font-medium text-slate-50">HuggingFace Token</h2>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        Optional — only needed for gated models (Llama, Gemma, etc.).
        The token is passed to the worker to download model weights.
      </p>

      <div className="mt-4 space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading settings...
          </div>
        ) : hasToken ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-slate-200">
                Token saved:{' '}
                <span className="font-mono text-xs text-slate-400">
                  ****{settings?.hf_token_last4}
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={handleRemoveToken}
              disabled={removing}
              className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-rose-400 transition-colors duration-150 hover:bg-rose-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {removing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
              Remove Token
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  setSaveError(null);
                }}
                placeholder="hf_xxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full rounded-lg border border-navy-700 bg-navy-900 py-2.5 pl-3 pr-10 font-mono text-sm text-slate-50 placeholder:text-slate-500 transition-colors duration-150 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowToken((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors duration-150 hover:text-slate-300"
                aria-label={showToken ? 'Hide token' : 'Show token'}
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={handleSaveToken}
              disabled={saving || !token.trim()}
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
            Your token is encrypted at rest and only sent to the training worker
            to download model weights.
          </span>
        </div>

        <a
          href="https://huggingface.co/settings/tokens"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-400 transition-colors duration-150 hover:text-blue-300"
        >
          Get a token at huggingface.co/settings/tokens
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
