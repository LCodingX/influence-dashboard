-- Add compute backend preference and RunPod config to profiles
ALTER TABLE profiles ADD COLUMN compute_backend TEXT DEFAULT 'hosted';
ALTER TABLE profiles ADD COLUMN runpod_api_key_encrypted TEXT;
ALTER TABLE profiles ADD COLUMN runpod_endpoint_id TEXT;

-- Add backend info to jobs table
ALTER TABLE jobs ADD COLUMN compute_backend TEXT DEFAULT 'hosted';
ALTER TABLE jobs ADD COLUMN runpod_job_id TEXT;
