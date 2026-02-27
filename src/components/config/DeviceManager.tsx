import { useState, useCallback } from 'react';
import {
  Cpu,
  Plus,
  Star,
  Trash2,
  Pencil,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';
import type { Device, RunPodGpuId } from '@/lib/types';
import { GPU_TYPES } from '@/lib/constants';
import { useDevices } from '@/hooks/useDevices';

export function DeviceManager() {
  const {
    devices,
    loading,
    error,
    createDevice,
    updateDevice,
    deleteDevice,
  } = useDevices();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addName, setAddName] = useState('');
  const [addGpuId, setAddGpuId] = useState<RunPodGpuId>('AMPERE_48');
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleAdd = useCallback(async () => {
    if (!addName.trim()) return;
    setAdding(true);
    setAddError(null);
    const result = await createDevice({ name: addName.trim(), gpu_id: addGpuId });
    if (result) {
      setShowAddDialog(false);
      setAddName('');
      setAddGpuId('AMPERE_48');
    } else {
      setAddError('Failed to create device. Check your RunPod API key and template configuration.');
    }
    setAdding(false);
  }, [addName, addGpuId, createDevice]);

  const handleSetDefault = useCallback(
    async (device: Device) => {
      if (device.is_default) return;
      await updateDevice({ id: device.id, is_default: true });
    },
    [updateDevice]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setDeleting(id);
      await deleteDevice(id);
      setDeleting(null);
    },
    [deleteDevice]
  );

  const handleRename = useCallback(
    async (id: string) => {
      if (!editName.trim()) return;
      await updateDevice({ id, name: editName.trim() });
      setEditingId(null);
      setEditName('');
    },
    [editName, updateDevice]
  );

  return (
    <div className="rounded-lg border border-navy-700 bg-navy-800 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-slate-300" />
          <h2 className="text-sm font-medium text-slate-50">GPU Devices</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-medium text-white transition-colors duration-150 hover:bg-blue-600"
        >
          <Plus size={12} />
          Add Device
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        Manage RunPod GPU endpoints for running training jobs. Each device creates a separate serverless endpoint.
      </p>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2.5">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-rose-400" />
          <span className="text-xs text-rose-300">{error}</span>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading devices...
          </div>
        ) : devices.length === 0 ? (
          <p className="text-xs text-slate-500">
            No devices configured. Add a device to get started.
          </p>
        ) : (
          devices.map((device) => (
            <div
              key={device.id}
              className="flex items-center justify-between rounded-lg border border-navy-700 bg-navy-900 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSetDefault(device)}
                  className={`transition-colors ${
                    device.is_default
                      ? 'text-amber-400'
                      : 'text-slate-600 hover:text-slate-400'
                  }`}
                  title={device.is_default ? 'Default device' : 'Set as default'}
                >
                  <Star size={14} fill={device.is_default ? 'currentColor' : 'none'} />
                </button>
                <div>
                  {editingId === device.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void handleRename(device.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="w-40 rounded border border-navy-600 bg-navy-800 px-2 py-1 text-sm text-slate-50 focus:border-blue-500 focus:outline-none"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => void handleRename(device.id)}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-xs text-slate-500 hover:text-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-200">
                        {device.name}
                      </span>
                      {device.is_default && (
                        <span className="rounded-full bg-amber-500/10 px-1.5 py-px text-[10px] text-amber-400">
                          default
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400">{device.gpu_display}</span>
                    <span className="text-[10px] text-slate-600 font-mono">
                      {device.endpoint_id}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(device.id);
                    setEditName(device.name);
                  }}
                  className="rounded p-1.5 text-slate-500 transition-colors hover:bg-navy-700 hover:text-slate-300"
                  title="Rename"
                >
                  <Pencil size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(device.id)}
                  disabled={deleting === device.id}
                  className="rounded p-1.5 text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50"
                  title="Delete"
                >
                  {deleting === device.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Trash2 size={12} />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Device Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-navy-700 bg-navy-800 p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-50">Add GPU Device</h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddDialog(false);
                  setAddError(null);
                }}
                className="text-slate-500 hover:text-slate-300"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Device Name</label>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Training A100, Dev GPU"
                  className="w-full rounded-lg border border-navy-700 bg-navy-900 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">GPU Type</label>
                <div className="space-y-2">
                  {GPU_TYPES.map((gpu) => (
                    <label
                      key={gpu.id}
                      className={`flex items-center justify-between rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                        addGpuId === gpu.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-navy-700 bg-navy-900 hover:border-navy-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="gpu_type"
                          value={gpu.id}
                          checked={addGpuId === gpu.id}
                          onChange={() => setAddGpuId(gpu.id)}
                          className="sr-only"
                        />
                        <div
                          className={`h-3 w-3 rounded-full border-2 flex items-center justify-center ${
                            addGpuId === gpu.id ? 'border-blue-500' : 'border-slate-600'
                          }`}
                        >
                          {addGpuId === gpu.id && (
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                          )}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-slate-200">
                            {gpu.label}
                          </span>
                          <span className="ml-2 text-xs text-slate-500">{gpu.vram} VRAM</span>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">
                        ~${gpu.costPerHour.toFixed(2)}/hr
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {addError && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-500/20 bg-rose-500/5 px-3 py-2.5">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-rose-400" />
                  <span className="text-xs text-rose-300">{addError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDialog(false);
                    setAddError(null);
                  }}
                  className="rounded-lg px-4 py-2 text-sm text-slate-400 transition-colors hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleAdd()}
                  disabled={adding || !addName.trim()}
                  className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {adding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {adding ? 'Creating...' : 'Create Device'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
