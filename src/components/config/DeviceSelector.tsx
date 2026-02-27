import { useEffect, useMemo } from 'react';
import { Cpu, AlertTriangle } from 'lucide-react';
import type { ModelTier } from '@/lib/types';
import { MODELS, TIER_COMPATIBLE_GPUS } from '@/lib/constants';
import { useDevices } from '@/hooks/useDevices';

interface DeviceSelectorProps {
  modelId: string;
  value: string | null;
  onChange: (deviceId: string | null) => void;
}

export function DeviceSelector({ modelId, value, onChange }: DeviceSelectorProps) {
  const { devices, loading } = useDevices();

  const modelTier: ModelTier | null = useMemo(() => {
    const model = MODELS.find((m) => m.id === modelId);
    return model?.tier ?? null;
  }, [modelId]);

  const compatibleDevices = useMemo(() => {
    if (!modelTier) return devices;
    const compatibleGpuIds = TIER_COMPATIBLE_GPUS[modelTier];
    return devices.filter((d) => compatibleGpuIds.includes(d.gpu_id));
  }, [devices, modelTier]);

  // Auto-select when there's exactly one compatible device
  useEffect(() => {
    if (compatibleDevices.length === 1 && value !== compatibleDevices[0].id) {
      onChange(compatibleDevices[0].id);
    } else if (compatibleDevices.length === 0) {
      onChange(null);
    } else if (value && !compatibleDevices.find((d) => d.id === value)) {
      // Current selection is no longer compatible — pick default or first
      const defaultDevice = compatibleDevices.find((d) => d.is_default);
      onChange(defaultDevice?.id ?? compatibleDevices[0]?.id ?? null);
    }
  }, [compatibleDevices, value, onChange]);

  if (loading || devices.length === 0) {
    return null;
  }

  // If only one device total, don't show the selector (it's auto-selected)
  if (devices.length === 1) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Cpu size={14} className="text-slate-500" />
        <label className="text-xs text-slate-400 uppercase tracking-wider font-medium">
          GPU Device
        </label>
      </div>

      {compatibleDevices.length === 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
          <span className="text-xs text-amber-300">
            No compatible GPU devices for this model tier. Add a more powerful GPU in Settings.
          </span>
        </div>
      ) : (
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          className="w-full rounded-lg border border-navy-700 bg-navy-900 px-3 py-2 text-sm text-slate-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 appearance-none cursor-pointer"
        >
          {compatibleDevices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.name} — {device.gpu_display}
              {device.is_default ? ' (default)' : ''}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
