-- Migration 004: Job logs and multi-GPU device management
-- Part 1: Structured job logging

CREATE TABLE job_logs (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  job_id     UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id),
  seq        INTEGER NOT NULL,
  timestamp  TIMESTAMPTZ NOT NULL DEFAULT now(),
  level      TEXT NOT NULL DEFAULT 'info',   -- info | warn | error | debug
  phase      TEXT,                           -- system | model_loading | training | influence | eval
  message    TEXT NOT NULL,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_logs_job_seq ON job_logs (job_id, seq);
CREATE INDEX idx_job_logs_user ON job_logs (user_id);
ALTER TABLE job_logs ADD CONSTRAINT unique_job_seq UNIQUE (job_id, seq);

ALTER TABLE job_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own job logs" ON job_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own job logs" ON job_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add log sequence cursor to jobs table
ALTER TABLE jobs ADD COLUMN log_seq_cursor INTEGER NOT NULL DEFAULT 0;

-- Part 2: Multi-GPU device management

CREATE TABLE devices (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) NOT NULL,
  name         TEXT NOT NULL,
  endpoint_id  TEXT NOT NULL,
  gpu_id       TEXT NOT NULL,        -- AMPERE_16, AMPERE_48, AMPERE_80
  gpu_display  TEXT NOT NULL,        -- A10 24GB, L40S 48GB, A100 80GB
  workers_min  INTEGER NOT NULL DEFAULT 0,
  workers_max  INTEGER NOT NULL DEFAULT 1,
  idle_timeout INTEGER NOT NULL DEFAULT 5,
  is_default   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_devices_user_id ON devices (user_id);
CREATE UNIQUE INDEX idx_devices_user_default ON devices (user_id) WHERE is_default = true;

ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own devices" ON devices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own devices" ON devices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own devices" ON devices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own devices" ON devices FOR DELETE USING (auth.uid() = user_id);

-- Add device reference to jobs
ALTER TABLE jobs ADD COLUMN device_id UUID REFERENCES devices(id);

-- Migrate existing single-endpoint users to a device row
INSERT INTO devices (user_id, name, endpoint_id, gpu_id, gpu_display, is_default)
SELECT id, 'Default GPU', runpod_endpoint_id, 'AMPERE_48', 'L40S 48GB', true
FROM profiles WHERE runpod_endpoint_id IS NOT NULL;
