import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, ExternalLink, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiCall } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';

export function SetupPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('Please enter your RunPod API key.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await apiCall('/api/settings/runpod-key', {
        method: 'POST',
        body: JSON.stringify({ api_key: apiKey.trim() }),
      });
      setSuccess(true);
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate API key');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-navy-900">
      <Header
        user={{
          display_name: user?.user_metadata?.full_name ?? user?.email ?? null,
          avatar_url: user?.user_metadata?.avatar_url ?? null,
        }}
        onSignOut={signOut}
      />

      <div className="flex flex-1 items-center justify-center px-4 pt-14">
        <div className="w-full max-w-lg">
          <div className="rounded-xl border border-navy-700 bg-navy-800 p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                <Key className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-50">
                  Connect Your GPU
                </h1>
                <p className="text-sm text-slate-400">
                  A RunPod API key is required to run training jobs.
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-lg border border-navy-700 bg-navy-900 p-4 text-sm text-slate-400">
              <p className="mb-3">
                This dashboard uses RunPod serverless GPUs to fine-tune models and
                compute influence scores. You'll need a RunPod account with API access.
              </p>
              <ol className="list-inside list-decimal space-y-1.5">
                <li>
                  Create a RunPod account at{' '}
                  <a
                    href="https://www.runpod.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
                  >
                    runpod.io <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>Add GPU credits to your account</li>
                <li>
                  Go to{' '}
                  <a
                    href="https://www.runpod.io/console/user/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300"
                  >
                    Settings → API Keys <ExternalLink className="h-3 w-3" />
                  </a>{' '}
                  and create a key
                </li>
                <li>Paste it below</li>
              </ol>
            </div>

            {success ? (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                <CheckCircle className="h-5 w-5 flex-shrink-0 text-emerald-400" />
                <div>
                  <p className="text-sm font-medium text-emerald-400">
                    API key verified and saved
                  </p>
                  <p className="text-xs text-emerald-400/70">
                    Redirecting to dashboard...
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <label
                  htmlFor="runpod-key"
                  className="mb-1.5 block text-sm font-medium text-slate-300"
                >
                  RunPod API Key
                </label>
                <div className="relative mb-4">
                  <input
                    id="runpod-key"
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="rp_xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full rounded-lg border border-navy-700 bg-navy-900 px-3 py-2.5 pr-10 font-mono text-sm text-slate-50 placeholder-slate-500 transition-colors duration-150 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {error && (
                  <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-400">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  loading={saving}
                >
                  Save & Verify Key
                </Button>

                <p className="mt-3 text-center text-xs text-slate-500">
                  Your key is encrypted at rest and only used to manage
                  serverless endpoints and submit training jobs.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
