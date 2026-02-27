# Influence Function Fine-Tuning Dashboard

## Project Overview

This is a research tool for AI safety researchers studying **model generalization under fine-tuning**. The dashboard lets researchers:

1. **Sign in** via Google OAuth or email/password (powered by Supabase Auth)
2. **Define training data** (right panel): Enter question-answer pairs to fine-tune a model on
3. **Define evaluation data** (left panel): Enter evaluation questions to test generalization
4. **Train a model**: Run LoRA/QLoRA fine-tuning on an open-source model via Modal
5. **Compute influence scores**: Calculate how much each training example influences each evaluation output using configurable influence function approximations
6. **Compare outputs**: View side-by-side results from the original model, few-shot prompted model, and fine-tuned model
7. **Visualize influence**: See a heatmap showing which training examples drove which evaluation outputs
8. **Save experiments**: All experiments are stored in the user's account and persist across sessions

The target audience is AI safety researchers (e.g., Redwood Research, Anthropic alignment team). The tool should feel like a serious research instrument, not a toy demo.

## Architecture

```
                    ┌─────────────────────────┐
                    │   Vercel (Frontend)      │
                    │   React + Vite (static)  │
                    │   + Serverless API Routes │
                    └──────────┬──────────────┘
                               │
                    ┌──────────▼──────────────┐
                    │   Supabase (Free Tier)   │
                    │   - Auth (Google + Email) │
                    │   - Postgres DB           │
                    │   - Row Level Security    │
                    └──────────┬──────────────┘
                               │
                    ┌──────────▼──────────────┐
                    │   Modal ($30/mo free)     │
                    │   - LoRA Fine-tuning      │
                    │   - Influence Functions    │
                    │   - Model Inference        │
                    └─────────────────────────┘
```

### Why this architecture
- **Vercel**: Free tier supports the static React frontend + serverless API routes that proxy requests to Modal. Handles CORS cleanly since the API routes and frontend share the same domain.
- **Supabase**: Free tier provides auth (Google OAuth + email/password), a Postgres database for storing experiments and results, and Row Level Security so users can only see their own data. No need to build auth from scratch.
- **Modal**: Free $30/month GPU credits for fine-tuning and influence computation. The Vercel API routes call Modal endpoints server-side, so Modal tokens never touch the browser.

**Security model**: The browser only ever talks to Vercel (same origin). Vercel API routes verify the user's Supabase JWT, then call Modal with a server-side secret. Supabase anon key is the only secret exposed to the client, and it's designed to be public (RLS protects data).

## File Structure

```
influence-dashboard/
├── CLAUDE.md
├── INSTRUCTIONS.md
├── package.json
├── vite.config.ts
├── vercel.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── .env.local                     # Local dev env vars (not committed)
├── .env.example                   # Template for env vars
├── .gitignore
├── .claude/
│   └── agents/
│       ├── frontend-dev.md
│       ├── modal-backend.md
│       └── design-reviewer.md
├── api/                           # Vercel serverless API routes
│   ├── train.ts                   # POST /api/train
│   ├── status.ts                  # GET /api/status?job_id=X
│   ├── results.ts                 # GET /api/results?job_id=X
│   ├── experiments.ts             # CRUD for saved experiments
│   ├── job-callback.ts            # Webhook for Modal to push results
│   └── _lib/
│       ├── modal.ts               # Modal API client (server-side only)
│       ├── supabase-admin.ts      # Supabase service role client (server-side only)
│       └── auth.ts                # Verify Supabase JWT from request headers
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── lib/
│   │   ├── supabase.ts            # Supabase browser client (anon key only)
│   │   ├── api.ts                 # Fetch wrapper for /api/* with auth headers
│   │   ├── types.ts               # All TypeScript interfaces
│   │   ├── constants.ts           # Model tiers, default hyperparams
│   │   ├── validation.ts          # Input validation
│   │   └── costEstimation.ts      # Compute cost estimates
│   ├── components/
│   │   ├── auth/
│   │   │   ├── AuthProvider.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── SignUpPage.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── PanelLayout.tsx
│   │   ├── training/
│   │   │   ├── TrainingPanel.tsx
│   │   │   ├── QAPairEditor.tsx
│   │   │   └── DatasetPreview.tsx
│   │   ├── evaluation/
│   │   │   ├── EvaluationPanel.tsx
│   │   │   ├── EvalQuestionEditor.tsx
│   │   │   └── ResultsComparison.tsx
│   │   ├── config/
│   │   │   ├── ModelSelector.tsx
│   │   │   ├── HyperparamPanel.tsx
│   │   │   └── InfluenceMethodSelector.tsx
│   │   ├── influence/
│   │   │   ├── InfluenceHeatmap.tsx
│   │   │   ├── InfluenceDetail.tsx
│   │   │   └── InfluenceSummary.tsx
│   │   ├── experiments/
│   │   │   ├── ExperimentList.tsx
│   │   │   ├── ExperimentCard.tsx
│   │   │   └── SaveExperimentDialog.tsx
│   │   ├── jobs/
│   │   │   ├── JobStatus.tsx
│   │   │   ├── JobHistory.tsx
│   │   │   └── CostEstimator.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Input.tsx
│   │       ├── Select.tsx
│   │       ├── Tabs.tsx
│   │       ├── Badge.tsx
│   │       ├── Tooltip.tsx
│   │       ├── Dialog.tsx
│   │       ├── Skeleton.tsx
│   │       ├── Avatar.tsx
│   │       └── DropdownMenu.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useApi.ts
│   │   ├── useJobPolling.ts
│   │   ├── useInfluenceData.ts
│   │   └── useExperiments.ts
│   └── store/
│       └── store.ts
├── modal_backend/
│   ├── README.md
│   ├── requirements.txt
│   ├── app.py
│   ├── train.py
│   ├── influence.py
│   ├── inference.py
│   ├── models.py
│   └── schemas.py
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
└── public/
    └── favicon.svg
```

## Database Schema (Supabase Postgres)

```sql
-- Profiles: extends Supabase Auth users
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on sign-up
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

-- Experiments: saved configurations
CREATE TABLE experiments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  training_data JSONB NOT NULL,
  eval_data JSONB NOT NULL,
  model_id TEXT NOT NULL,
  hyperparams JSONB NOT NULL,
  influence_method TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Jobs: individual training runs
CREATE TABLE jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  experiment_id UUID REFERENCES experiments(id),
  modal_job_id TEXT,
  status TEXT DEFAULT 'queued',
  progress REAL DEFAULT 0,
  current_epoch INTEGER,
  total_epochs INTEGER,
  training_loss REAL,
  config JSONB NOT NULL,
  results JSONB,
  training_metadata JSONB,
  error TEXT,
  estimated_cost_usd REAL,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users read own experiments" ON experiments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own experiments" ON experiments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own experiments" ON experiments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own experiments" ON experiments FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users read own jobs" ON jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own jobs" ON jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
```

## Auth Implementation

### Supabase Client Setup (browser-side)
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

### AuthProvider
- Wraps the app in a React context providing `{ user, session, signIn, signUp, signInWithGoogle, signOut, loading }`
- On mount, calls `supabase.auth.getSession()` and subscribes to `onAuthStateChange`
- `signInWithGoogle` calls `supabase.auth.signInWithOAuth({ provider: 'google' })`
- `signIn` calls `supabase.auth.signInWithPassword({ email, password })`
- `signUp` calls `supabase.auth.signUp({ email, password })`

### API Auth Middleware (server-side)
```typescript
// api/_lib/auth.ts
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function verifyAuth(req: VercelRequest) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  return user;
}
```

### Authenticated API Calls (browser-side)
```typescript
// src/lib/api.ts
import { supabase } from './supabase';

export async function apiCall(path: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      ...options.headers,
    },
  });
  
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }
  return res.json();
}
```

## Environment Variables

### .env.example (committed)
```
# Supabase (public — safe for browser)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Supabase (private — server-side only, NEVER prefix with VITE_)
SUPABASE_SERVICE_ROLE_KEY=

# Modal (private — server-side only)
MODAL_TOKEN_ID=
MODAL_TOKEN_SECRET=
MODAL_ENDPOINT_URL=
MODAL_WEBHOOK_SECRET=
```

**CRITICAL**: Only variables prefixed with `VITE_` are exposed to the browser. `SUPABASE_SERVICE_ROLE_KEY`, `MODAL_TOKEN_ID`, `MODAL_TOKEN_SECRET` must NEVER have the `VITE_` prefix.

## Vercel Configuration

### vercel.json
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## Design Principles

### Visual Design
- **Dark theme primary**, light theme secondary (toggle in header)
- Color palette: deep navy/slate backgrounds (#0F172A, #1E293B), electric blue accents (#3B82F6), warm amber for warnings (#F59E0B), emerald for success (#10B981), rose for errors (#F43F5E)
- Monospace font (JetBrains Mono via Google Fonts) for data/code areas, Inter for UI text
- Clean data-dense layouts — prioritize information density over whitespace
- Subtle transitions (150-200ms) on state changes
- The influence heatmap is the visual centerpiece — diverging color scale (blue = negative, white = neutral, red = positive)

### Login Page
- Centered card on a dark gradient background
- Project name + one-line description at top
- "Continue with Google" button (prominent, with Google icon)
- Divider: "or continue with email"
- Email + password fields
- "Sign in" / "Create account" toggle at bottom
- Professional, minimal, trust-building

### Dashboard Layout
- Fixed header with logo, user avatar + dropdown (sign out, settings)
- Left sidebar: navigation (Dashboard, Experiments, Settings)
- Main area: resizable split panels
  - Left panel: Evaluation questions + results comparison
  - Right panel: Training data + configuration
  - Bottom panel (expandable): Influence heatmap + details

### Code Quality
- Strict TypeScript — no `any` types
- All components are functional with hooks
- Custom hooks for all API interaction and auth logic
- Constants extracted to `constants.ts`
- Server-side secrets never exposed to the client
- All Supabase queries use typed clients (generate types from schema)

## Modal Backend Specification

### Security
All Modal endpoints verify a shared secret in the `X-Webhook-Secret` header. This secret is set as a Vercel env var (`MODAL_WEBHOOK_SECRET`) and a Modal secret. Only Vercel API routes know this secret.

### Endpoint: POST /train
```json
{
  "job_id": "uuid-from-supabase",
  "model_id": "google/gemma-3-12b",
  "training_data": [{"question": "...", "answer": "..."}],
  "hyperparams": {
    "learning_rate": 2e-5,
    "num_epochs": 50,
    "batch_size": 4,
    "lora_rank": 16,
    "lora_alpha": 32,
    "lora_target_modules": ["q_proj", "v_proj"],
    "quantization": "4bit",
    "max_seq_length": 512,
    "warmup_ratio": 0.1,
    "weight_decay": 0.01
  },
  "influence_method": "tracin",
  "eval_data": [{"question": "..."}],
  "checkpoint_interval": 10,
  "callback_url": "https://your-app.vercel.app/api/job-callback"
}
```

### Endpoint: GET /status/{job_id}
```json
{
  "status": "training",
  "progress": 0.45,
  "current_epoch": 23,
  "total_epochs": 50,
  "training_loss": 0.342,
  "eta_seconds": 330
}
```

### Endpoint: GET /results/{job_id}
Returns full eval results, influence matrix, and training metadata (see full spec in previous version).

### POST /job-callback (Vercel endpoint)
Modal calls this webhook when a job completes or fails. The Vercel handler verifies the webhook secret and updates the Supabase `jobs` table.

## Influence Function Implementations

### TracIn (Fast)
- During training, save LoRA adapter checkpoints every `checkpoint_interval` epochs
- For each (training_example, eval_example) pair:
  - At each checkpoint, compute gradient of loss on training_example w.r.t. LoRA params
  - Compute gradient of loss on eval_example w.r.t. LoRA params
  - Influence = sum over checkpoints of (learning_rate × dot_product(grad_train, grad_eval))

### DataInf (Balanced)
- After training, compute per-example LoRA gradients for all training and eval examples
- Influence ≈ grad_eval^T (λI + GG^T/n)^{-1} grad_train
- For LoRA, gradient dimension is small, so matrix inversion is tractable
- Reference: Kwon et al. 2024

### Kronfluence (Precise)
- Use the `kronfluence` library
- Kronecker-factored approximate curvature (EK-FAC) of the Fisher
- 2-3x compute cost of TracIn but highest quality estimates

## Model Support

| Tier | Example Models | GPU | Modal Cost/hr |
|------|---------------|-----|---------------|
| Small (≤3B) | gemma-3-1b, llama-3.2-3b, phi-4-mini | A10 24GB | ~$1.10 |
| Medium (7-12B) | gemma-3-12b, llama-3.1-8b, mistral-7b | L40S 48GB | ~$1.95 |
| Large (13-34B) | llama-3.3-33b, qwen-2.5-32b | A100 80GB | ~$2.50 |
| XL (70B+) | llama-3.1-70b, qwen-2.5-72b | A100 80GB | ~$2.50+ |

## Development Commands

```bash
# Local development (frontend + API routes)
npm install
npx vercel dev

# Just frontend
npm run dev

# Production build
npm run build

# Deploy frontend + API routes
vercel --prod

# Modal backend
cd modal_backend
pip install -r requirements.txt
modal serve app.py     # Local dev
modal deploy app.py    # Production

# Database
# Run SQL from supabase/migrations/ in Supabase dashboard SQL editor
```

## Sub-Agent Routing Rules

**Parallel dispatch** (ALL conditions must be met):
- 3+ unrelated tasks or independent domains
- No shared state between tasks
- Clear file boundaries with no overlap

**Sequential dispatch** (ANY condition triggers):
- Tasks have dependencies (B needs output from A)
- Shared files or state
- Unclear scope

**Background dispatch**:
- Research or analysis tasks (not file modifications)
