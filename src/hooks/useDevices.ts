import { useState, useEffect, useCallback } from 'react';
import { apiCall } from '@/lib/api';
import type { Device, ModelTier, RunPodGpuId } from '@/lib/types';
import { TIER_COMPATIBLE_GPUS } from '@/lib/constants';

interface CreateDevicePayload {
  name: string;
  gpu_id: RunPodGpuId;
}

interface UpdateDevicePayload {
  id: string;
  name?: string;
  is_default?: boolean;
}

interface UseDevicesReturn {
  devices: Device[];
  loading: boolean;
  error: string | null;
  createDevice: (payload: CreateDevicePayload) => Promise<Device | null>;
  updateDevice: (payload: UpdateDevicePayload) => Promise<Device | null>;
  deleteDevice: (id: string) => Promise<boolean>;
  getCompatibleDevices: (modelTier: ModelTier) => Device[];
  refresh: () => Promise<void>;
}

export function useDevices(): UseDevicesReturn {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall<Device[]>('/api/settings/devices');
      setDevices(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load devices';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDevices();
  }, [fetchDevices]);

  const createDevice = useCallback(
    async (payload: CreateDevicePayload): Promise<Device | null> => {
      try {
        const device = await apiCall<Device>('/api/settings/devices', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setDevices((prev) => [...prev, device]);
        return device;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create device';
        setError(message);
        return null;
      }
    },
    []
  );

  const updateDevice = useCallback(
    async (payload: UpdateDevicePayload): Promise<Device | null> => {
      try {
        const device = await apiCall<Device>('/api/settings/devices', {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setDevices((prev) =>
          prev.map((d) => {
            if (d.id === device.id) return device;
            // If the updated device is now default, clear old default
            if (device.is_default && d.is_default) return { ...d, is_default: false };
            return d;
          })
        );
        return device;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update device';
        setError(message);
        return null;
      }
    },
    []
  );

  const deleteDevice = useCallback(async (id: string): Promise<boolean> => {
    try {
      await apiCall<{ success: boolean }>(
        `/api/settings/devices?id=${encodeURIComponent(id)}`,
        { method: 'DELETE' }
      );
      setDevices((prev) => prev.filter((d) => d.id !== id));
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete device';
      setError(message);
      return false;
    }
  }, []);

  const getCompatibleDevices = useCallback(
    (modelTier: ModelTier): Device[] => {
      const compatibleGpuIds = TIER_COMPATIBLE_GPUS[modelTier];
      return devices.filter((d) =>
        compatibleGpuIds.includes(d.gpu_id)
      );
    },
    [devices]
  );

  return {
    devices,
    loading,
    error,
    createDevice,
    updateDevice,
    deleteDevice,
    getCompatibleDevices,
    refresh: fetchDevices,
  };
}
