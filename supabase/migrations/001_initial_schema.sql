-- =========================================================================
-- Influence Dashboard: Initial Schema
-- =========================================================================
-- Run this migration in the Supabase SQL Editor or via the CLI:
--   supabase db push
--
-- Tables:
--   profiles    -- extends Supabase Auth users
--   experiments -- saved experiment configurations
--   jobs        -- individual training / influence computation runs
--
-- All tables use Row Level Security so users can only access their own data.
-- =========================================================================


-- -------------------------------------------------------------------------
-- 1. Profiles
-- -------------------------------------------------------------------------

CREATE TABLE profiles (
  id          UUID REFERENCES auth.users(id) PRIMARY KEY,
  display_name TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Auto-create a profile row whenever a new user signs up.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- -------------------------------------------------------------------------
-- 2. Experiments
-- -------------------------------------------------------------------------

CREATE TABLE experiments (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id) NOT NULL,
  name             TEXT NOT NULL,
  description      TEXT,
  training_data    JSONB NOT NULL,
  eval_data        JSONB NOT NULL,
  model_id         TEXT NOT NULL,
  hyperparams      JSONB NOT NULL,
  influence_method TEXT NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);


-- -------------------------------------------------------------------------
-- 3. Jobs
-- -------------------------------------------------------------------------

CREATE TABLE jobs (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID REFERENCES auth.users(id) NOT NULL,
  experiment_id      UUID REFERENCES experiments(id),
  modal_job_id       TEXT,
  status             TEXT DEFAULT 'queued',
  progress           REAL DEFAULT 0,
  current_epoch      INTEGER,
  total_epochs       INTEGER,
  training_loss      REAL,
  config             JSONB NOT NULL,
  results            JSONB,
  training_metadata  JSONB,
  error              TEXT,
  estimated_cost_usd REAL,
  created_at         TIMESTAMPTZ DEFAULT now(),
  completed_at       TIMESTAMPTZ
);


-- -------------------------------------------------------------------------
-- 4. Row Level Security
-- -------------------------------------------------------------------------

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Experiments
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own experiments"
  ON experiments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own experiments"
  ON experiments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own experiments"
  ON experiments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own experiments"
  ON experiments FOR DELETE
  USING (auth.uid() = user_id);

-- Jobs
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own jobs"
  ON jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own jobs"
  ON jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
