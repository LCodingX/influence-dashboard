export interface TrainJobConfig {
  job_id: string;
  model_id: string;
  training_data: Array<{ question: string; answer: string }>;
  eval_data: Array<{ question: string }>;
  hyperparams: Record<string, unknown>;
  influence_method: string;
  checkpoint_interval: number;
  callback_url: string;
  hf_token?: string | null;
}

export interface JobStatusResult {
  status: string;
  progress: number;
  current_epoch: number | null;
  total_epochs: number | null;
  training_loss: number | null;
  eta_seconds: number | null;
}

export interface JobResultsData {
  eval_results: Array<Record<string, unknown>>;
  influence: Record<string, unknown>;
  training_metadata: Record<string, unknown>;
}

export interface RunPodCredentials {
  apiKey: string;
  endpointId: string;
}

const RUNPOD_API_BASE = 'https://api.runpod.ai/v2';

interface RunPodRunResponse {
  id: string;
  status: string;
}

interface RunPodStatusResponse {
  id: string;
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMED_OUT';
  output?: {
    eval_results?: Array<Record<string, unknown>>;
    influence?: Record<string, unknown>;
    training_metadata?: Record<string, unknown>;
    progress?: number;
    current_epoch?: number;
    total_epochs?: number;
    training_loss?: number;
    eta_seconds?: number;
  };
  error?: string;
}

interface RunPodStreamEntry {
  output?: {
    status?: string;
    progress?: number;
    current_epoch?: number;
    total_epochs?: number;
    training_loss?: number;
    eta_seconds?: number;
  };
}

/**
 * Map RunPod job statuses to our internal status strings.
 */
function mapRunPodStatus(rpStatus: string): string {
  switch (rpStatus) {
    case 'IN_QUEUE':
      return 'queued';
    case 'IN_PROGRESS':
      return 'training';
    case 'COMPLETED':
      return 'completed';
    case 'FAILED':
    case 'TIMED_OUT':
      return 'failed';
    case 'CANCELLED':
      return 'failed';
    default:
      return 'queued';
  }
}

/**
 * RunPod serverless compute backend (BYOC - Bring Your Own Compute).
 * Users provide their own RunPod API key and we manage endpoints on their behalf.
 */
export class RunPodBackend {
  private apiKey: string;
  private endpointId: string;

  constructor(credentials: RunPodCredentials) {
    if (!credentials.apiKey) {
      throw new Error('RunPod API key is required');
    }
    if (!credentials.endpointId) {
      throw new Error('RunPod endpoint ID is required');
    }
    this.apiKey = credentials.apiKey;
    this.endpointId = credentials.endpointId;
  }

  private async callRunPod<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${RUNPOD_API_BASE}/${this.endpointId}${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      ...(options.headers as Record<string, string> | undefined),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage: string;
      try {
        const errorBody = await response.json();
        errorMessage =
          (errorBody as Record<string, string>).error ||
          (errorBody as Record<string, string>).message ||
          JSON.stringify(errorBody);
      } catch {
        errorMessage = `RunPod API error: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    return response.json() as Promise<T>;
  }

  async submitJob(config: TrainJobConfig): Promise<{ jobId: string }> {
    const response = await this.callRunPod<RunPodRunResponse>('/run', {
      method: 'POST',
      body: JSON.stringify({
        input: {
          job_id: config.job_id,
          model_id: config.model_id,
          training_data: config.training_data,
          eval_data: config.eval_data,
          hyperparams: config.hyperparams,
          influence_method: config.influence_method,
          checkpoint_interval: config.checkpoint_interval,
          callback_url: config.callback_url,
          hf_token: config.hf_token ?? null,
        },
      }),
    });

    return { jobId: response.id };
  }

  async getStatus(jobId: string): Promise<JobStatusResult> {
    // Try the /stream endpoint first for real-time progress updates
    try {
      const streamResponse = await this.callRunPod<RunPodStreamEntry[]>(
        `/stream/${jobId}`
      );

      if (streamResponse && streamResponse.length > 0) {
        // Get the latest stream entry
        const latest = streamResponse[streamResponse.length - 1];
        if (latest.output) {
          return {
            status: latest.output.status || 'training',
            progress: latest.output.progress ?? 0,
            current_epoch: latest.output.current_epoch ?? null,
            total_epochs: latest.output.total_epochs ?? null,
            training_loss: latest.output.training_loss ?? null,
            eta_seconds: latest.output.eta_seconds ?? null,
          };
        }
      }
    } catch {
      // Stream endpoint may not be available; fall back to /status
    }

    // Fall back to the /status endpoint
    const statusResponse = await this.callRunPod<RunPodStatusResponse>(
      `/status/${jobId}`
    );

    const mappedStatus = mapRunPodStatus(statusResponse.status);

    return {
      status: mappedStatus,
      progress: statusResponse.output?.progress ?? (mappedStatus === 'completed' ? 1 : 0),
      current_epoch: statusResponse.output?.current_epoch ?? null,
      total_epochs: statusResponse.output?.total_epochs ?? null,
      training_loss: statusResponse.output?.training_loss ?? null,
      eta_seconds: statusResponse.output?.eta_seconds ?? null,
    };
  }

  async getResults(jobId: string): Promise<JobResultsData> {
    const statusResponse = await this.callRunPod<RunPodStatusResponse>(
      `/status/${jobId}`
    );

    if (statusResponse.status !== 'COMPLETED') {
      throw new Error(
        `Job is not completed (current RunPod status: ${statusResponse.status})`
      );
    }

    if (!statusResponse.output) {
      throw new Error('Job completed but no output data available');
    }

    return {
      eval_results: statusResponse.output.eval_results ?? [],
      influence: statusResponse.output.influence ?? {},
      training_metadata: statusResponse.output.training_metadata ?? {},
    };
  }

  async cancelJob(jobId: string): Promise<void> {
    await this.callRunPod<Record<string, unknown>>(`/cancel/${jobId}`, {
      method: 'POST',
    });
  }

  /**
   * Create a new RunPod serverless endpoint for training jobs.
   * This is called during first-time setup when a user configures their RunPod key.
   */
  static async createEndpoint(
    apiKey: string,
    templateId: string,
    name: string = 'influence-dashboard-training'
  ): Promise<string> {
    const mutation = `
      mutation {
        saveEndpoint(input: {
          name: "${name}"
          templateId: "${templateId}"
          workersMin: 0
          workersMax: 1
          idleTimeout: 5
          gpuIds: "AMPERE_48"
          scalerType: "QUEUE_DELAY"
          scalerValue: 1
        }) {
          id
          name
        }
      }
    `;

    const response = await fetch('https://api.runpod.io/graphql?api_key=' + apiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: mutation }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create RunPod endpoint: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      data?: { saveEndpoint?: { id: string } };
      errors?: Array<{ message: string }>;
    };

    if (data.errors && data.errors.length > 0) {
      throw new Error(`Failed to create RunPod endpoint: ${data.errors[0].message}`);
    }

    if (!data.data?.saveEndpoint?.id) {
      throw new Error('Failed to create RunPod endpoint: no ID returned');
    }

    return data.data.saveEndpoint.id;
  }

  /**
   * Validate a RunPod API key by querying the GraphQL API.
   * Returns true if the key is valid, throws on error.
   */
  static async validateApiKey(apiKey: string): Promise<boolean> {
    const response = await fetch('https://api.runpod.io/graphql?api_key=' + apiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: '{ myself { id } }',
      }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Invalid RunPod API key');
      }
      throw new Error(`RunPod API returned status ${response.status}`);
    }

    const data = await response.json() as { errors?: Array<{ message: string }> };
    if (data.errors && data.errors.length > 0) {
      throw new Error('Invalid RunPod API key');
    }

    return true;
  }
}
