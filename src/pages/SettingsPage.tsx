import { useAuth } from '@/hooks/useAuth';
import { useComputeBackend } from '@/hooks/useComputeBackend';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { BackendConfig } from '@/components/config/BackendConfig';
import { HuggingFaceConfig } from '@/components/config/HuggingFaceConfig';

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const { settings, loading: settingsLoading, refresh: refreshSettings } = useComputeBackend();

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
          <h1 className="text-xl font-semibold text-slate-50">Settings</h1>
          <p className="mt-1 text-sm text-slate-400">
            Account and application settings.
          </p>

          <div className="mt-6 space-y-6">
            {/* Account section */}
            <div className="rounded-lg border border-navy-700 bg-navy-800 p-6">
              <h2 className="text-sm font-medium text-slate-50">Account</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-400">
                <p>
                  <span className="text-slate-500">Email:</span>{' '}
                  {user?.email ?? 'N/A'}
                </p>
                <p>
                  <span className="text-slate-500">User ID:</span>{' '}
                  <span className="font-mono text-xs">{user?.id ?? 'N/A'}</span>
                </p>
              </div>
            </div>

            {/* Compute Backend section */}
            <BackendConfig
              settings={settings}
              loading={settingsLoading}
              onRefresh={refreshSettings}
            />

            {/* HuggingFace Token section */}
            <HuggingFaceConfig
              settings={settings}
              loading={settingsLoading}
              onRefresh={refreshSettings}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
