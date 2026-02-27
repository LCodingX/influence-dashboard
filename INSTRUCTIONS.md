# Instructions: Building & Deploying the Influence Function Dashboard

## Prerequisites

- **Node.js 18+** and **npm**
- **Python 3.10+** and **pip**
- **Claude Code** (`npm install -g @anthropic-ai/claude-code`)
- **Vercel CLI** (`npm install -g vercel`)
- **Modal CLI** (`pip install modal`)
- **Git**
- A **Google account** (for setting up Google OAuth)

Accounts you'll need (all have free tiers):
- **Vercel** — https://vercel.com (sign up with GitHub)
- **Supabase** — https://supabase.com (sign up with GitHub)
- **Modal** — https://modal.com (sign up with GitHub)
- **HuggingFace** (optional) — https://huggingface.co (for gated models like Llama)

---

## Part 0: Understanding the Subagent Setup

This project uses Claude Code **subagents** to parallelize development. Three agents are defined in `.claude/agents/`:

| Agent | Role | Owns | Model |
|-------|------|------|-------|
| `frontend-dev` | React/TS, Tailwind, Recharts, Zustand | `src/`, configs | sonnet |
| `modal-backend` | Python, Modal, PEFT, influence functions | `modal_backend/` | sonnet |
| `design-reviewer` | Read-only UX/design review | Nothing | sonnet |

### How subagents work

Subagents are markdown files with YAML frontmatter stored in `.claude/agents/`. When you start a Claude Code session, Claude loads all agents and can automatically delegate tasks to the right one based on its `description` field. Each subagent runs in its own context window with its own system prompt and tool restrictions.

### How to create a new subagent

**Option A: Interactive (recommended)**
```bash
# Inside a Claude Code session:
/agents
# → "Create new agent"
# → Choose "Project" (shared via git) or "Personal" (just you)
# → Choose "Generate with Claude" and describe what the agent should do
# → Review the generated file, edit if needed, save
```

**Option B: Manual**

Create a file at `.claude/agents/your-agent-name.md`:

```markdown
---
name: your-agent-name
description: >
  Describe WHEN Claude should delegate to this agent. Be specific.
  Claude uses this to auto-route tasks.
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
---

You are a [role].

## What you do
- ...

## Rules
- ...

## Files you own
- ...
```

**Key configuration options:**
- `tools`: Which tools the agent can use. Omit to inherit all. Use `Read, Glob, Grep` for read-only agents.
- `model`: `sonnet` (fast/cheap), `opus` (smartest), or `inherit` (match parent session).
- `description`: How Claude decides when to auto-delegate. Make it action-oriented.

**Scope:**
- `.claude/agents/` — Project-level, shared via git with your team
- `~/.claude/agents/` — User-level, personal, available in all projects
- Project agents override user agents with the same name

**Verify agents are loaded:**
```bash
claude agents    # Lists all agents and shows overrides
```

**Explicitly invoke an agent:**
```
Use the frontend-dev subagent to build the LoginPage component
```

**Parallel dispatch:**
```
In parallel:
- Use frontend-dev to build the InfluenceHeatmap
- Use modal-backend to implement TracIn
```

Claude auto-delegates when it recognizes a task matches an agent's description. You can also always invoke explicitly.

---

## Part 1: Set Up Supabase (Auth + Database)

### Step 1: Create a Supabase project

1. Go to https://supabase.com → "New Project"
2. Choose a name (e.g., `influence-dashboard`), set a database password, pick a region close to you
3. Wait for the project to provision (~2 minutes)

### Step 2: Get your keys

In the Supabase dashboard → Settings → API:
- Copy **Project URL** (e.g., `https://abcdefg.supabase.co`)
- Copy **anon/public key** (starts with `eyJ...`)
- Copy **service_role key** (starts with `eyJ...`) — keep this secret

### Step 3: Enable Google OAuth

1. In Supabase dashboard → Authentication → Providers → Google
2. Toggle "Enable"
3. You need a Google OAuth client ID and secret:
   - Go to https://console.cloud.google.com → APIs & Services → Credentials
   - Create an OAuth 2.0 Client ID (Web application)
   - Add authorized redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
   - Copy the Client ID and Client Secret
4. Paste them into the Supabase Google provider settings
5. Save

### Step 4: Enable Email/Password auth

This is enabled by default in Supabase. Optionally, in Authentication → Settings:
- Toggle "Confirm email" on/off (off is simpler for development)
- Set minimum password length

### Step 5: Create the database schema

1. In Supabase dashboard → SQL Editor
2. Paste and run the SQL from `supabase/migrations/001_initial_schema.sql` (this is defined in CLAUDE.md and will be generated when Claude Code scaffolds the project)
3. Verify tables were created: go to Table Editor and check for `profiles`, `experiments`, `jobs`

### Step 6: Configure auth redirect URLs

In Authentication → URL Configuration:
- **Site URL**: `http://localhost:3000` (for development) — you'll change this to your Vercel URL later
- **Redirect URLs**: Add both:
  - `http://localhost:3000`
  - `http://localhost:5173`
  - `https://your-app.vercel.app` (add after Vercel deploy)

---

## Part 2: Set Up Modal (GPU Backend)

### Step 1: Authenticate

```bash
modal setup
# Opens browser to authenticate — your token saves to ~/.modal.toml
```

### Step 2: Set HuggingFace secret (optional, for gated models)

```bash
modal secret create huggingface-secret HF_TOKEN=hf_your_token_here
```

### Step 3: Create a webhook secret

Generate a random secret for securing the Vercel → Modal communication:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
# Save this — you'll use it as MODAL_WEBHOOK_SECRET in both Vercel and Modal
```

```bash
modal secret create webhook-secret WEBHOOK_SECRET=your_generated_secret
```

---

## Part 3: Scaffold and Build with Claude Code

### Step 1: Initialize the project

```bash
mkdir influence-dashboard
cd influence-dashboard
git init

# Copy in CLAUDE.md and .claude/agents/ (the files from this package)
# Then:

claude
```

### Step 2: Scaffold everything

Tell Claude:

```
Read CLAUDE.md thoroughly. Then scaffold the entire project:

1. Initialize Vite + React + TypeScript with all dependencies (including 
   @supabase/supabase-js, zustand, recharts, lucide-react)
2. Set up Tailwind CSS with the dark theme color palette from CLAUDE.md
3. Create .env.example with all required variables
4. Create vercel.json
5. Create the Supabase migration SQL file
6. Create all component files with proper TypeScript interfaces (placeholder implementations)
7. Create the Zustand store
8. Create all hooks with typed signatures
9. Create the Vercel API routes in api/ with auth middleware
10. Create the Modal backend directory with requirements.txt and placeholder files

Don't implement business logic yet — focus on correct types, file structure, and wiring.
```

### Step 3: Build the auth flow

```
Build the authentication flow:
1. AuthProvider with Supabase session management
2. LoginPage with Google OAuth button and email/password form
3. SignUpPage
4. ProtectedRoute wrapper
5. Header with user avatar and sign-out dropdown
6. Wire it into App.tsx with React Router

Test it by running `npx vercel dev` and signing in.
```

### Step 4: Build the frontend

```
Build the dashboard UI:
1. PanelLayout with resizable left/right panels
2. TrainingPanel with QAPairEditor (add/remove/edit QA pairs)
3. EvaluationPanel with EvalQuestionEditor
4. ModelSelector with GPU tier badges and cost display
5. HyperparamPanel with sensible defaults and "Advanced" expandable section
6. InfluenceMethodSelector (TracIn / DataInf / Kronfluence with descriptions)
7. CostEstimator that updates as config changes
8. JobStatus with progress bar, loss curve, and ETA
9. ResultsComparison showing base / few-shot / finetuned side by side
10. InfluenceHeatmap as the centerpiece visualization
11. ExperimentList and SaveExperimentDialog

Make it look professional and research-tool-quality.
```

### Step 5: Build the Modal backend

```
Build the Modal backend:
1. Modal app with proper image (transformers, peft, bitsandbytes, torch)
2. /train endpoint: LoRA fine-tuning with configurable hyperparams
3. /status endpoint: return job progress
4. /results endpoint: return eval results + influence matrix
5. All three influence implementations (TracIn, DataInf, Kronfluence)
6. Model loading with auto GPU selection based on parameter count
7. Proper error handling for OOM, preemption, invalid models
8. Webhook secret verification on all endpoints
```

### Step 6: Build the Vercel API routes

```
Build the Vercel serverless API routes:
1. api/_lib/auth.ts: verify Supabase JWT
2. api/_lib/modal.ts: call Modal endpoints with webhook secret
3. api/_lib/supabase-admin.ts: Supabase service role client
4. api/train.ts: validate request, save job to Supabase, call Modal
5. api/status.ts: proxy status from Modal, update Supabase job record
6. api/results.ts: fetch results from Modal, save to Supabase
7. api/experiments.ts: CRUD for saved experiments
8. api/job-callback.ts: webhook for Modal to push completion/failure
```

### Step 7: Design review

```
Use the design-reviewer subagent to review all components. Fix any critical issues.
```

---

## Part 4: Local Testing

### Set up environment variables

Create `.env.local` in the project root:
```bash
# From Supabase dashboard
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# From Supabase dashboard (service role — keep secret)
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# From Modal (modal token list)
MODAL_TOKEN_ID=ak-...
MODAL_TOKEN_SECRET=as-...

# Will be set after `modal serve` or `modal deploy`
MODAL_ENDPOINT_URL=https://your-user--influence-dashboard.modal.run

# The webhook secret you generated earlier
MODAL_WEBHOOK_SECRET=your_generated_secret
```

### Test the frontend + API routes locally

```bash
npx vercel dev
# Opens at http://localhost:3000
# This runs both the Vite frontend AND the serverless API routes
```

### Test the Modal backend locally

```bash
cd modal_backend
modal serve app.py
# Prints temporary endpoint URLs — copy the base URL to MODAL_ENDPOINT_URL in .env.local
```

### End-to-end test

1. Sign in (Google or email)
2. Enter 2-3 training QA pairs
3. Enter 1-2 evaluation questions
4. Select a small model (gemma-3-1b) for fast testing
5. Set epochs to 5, influence method to TracIn
6. Click "Train & Compute Influence"
7. Watch the progress bar
8. Verify results appear: three-way comparison + influence heatmap

---

## Part 5: Deploy to Production

### Step 1: Deploy the Modal backend

```bash
cd modal_backend
modal deploy app.py
```

Note the permanent endpoint URL (e.g., `https://your-user--influence-dashboard.modal.run`).

### Step 2: Deploy to Vercel

```bash
# From the project root
vercel

# First time: follow the prompts
# - Link to your Vercel account
# - Create a new project
# - Accept the detected settings (Vite framework)
```

### Step 3: Set environment variables in Vercel

Go to your Vercel project → Settings → Environment Variables. Add all variables from `.env.local`:

| Variable | Value | Environment |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | All |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | All |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | All |
| `MODAL_TOKEN_ID` | `ak-...` | All |
| `MODAL_TOKEN_SECRET` | `as-...` | All |
| `MODAL_ENDPOINT_URL` | `https://your-user--influence-dashboard.modal.run` | All |
| `MODAL_WEBHOOK_SECRET` | `your_secret` | All |

### Step 4: Redeploy with env vars

```bash
vercel --prod
```

### Step 5: Update Supabase redirect URLs

Go to Supabase → Authentication → URL Configuration:
- Set **Site URL** to `https://your-app.vercel.app`
- Add `https://your-app.vercel.app` to **Redirect URLs**
- Add `https://your-app.vercel.app/**` as well (for deep linking)

### Step 6: Update Google OAuth redirect URI

In Google Cloud Console → Credentials → your OAuth client:
- Add `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback` if not already there
- This should already be set from Part 1 — just verify it

### Step 7: Verify production deployment

1. Visit `https://your-app.vercel.app`
2. Sign in with Google
3. Run a small test experiment
4. Verify results are saved and visible on refresh / different device

---

## Part 6: Custom Domain (Optional)

### Vercel
1. Vercel dashboard → your project → Settings → Domains
2. Add your domain (e.g., `influence.yourdomain.com`)
3. Follow Vercel's DNS instructions (add CNAME record)

### Update Supabase
- Add the custom domain to Supabase's redirect URLs
- Update Site URL if desired

---

## Part 7: Ongoing Development

### Adding a new model to the selector
Just type any HuggingFace model ID in the dashboard. The backend auto-detects parameter count and GPU. To pre-cache it in the Modal image (faster cold starts), add it to the download list in `modal_backend/app.py`.

### Adding a new influence method
1. Implement in `modal_backend/influence.py`
2. Add to the enum in `modal_backend/schemas.py`
3. Add as option in `src/components/config/InfluenceMethodSelector.tsx`
4. Update `src/lib/costEstimation.ts`

### Adding a new subagent
```bash
/agents  # inside Claude Code
# → Create new agent → Project → Generate with Claude
```

Or manually create `.claude/agents/new-agent.md` following the format in Part 0.

### Running agents in parallel
```
In parallel:
- Use frontend-dev to add dark/light theme toggle
- Use modal-backend to optimize TracIn memory usage
- Use design-reviewer to audit the experiments page
```

---

## Troubleshooting

### "Invalid API key" or 401 on sign-in
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
- These must be prefixed with `VITE_` to be available in the browser
- Check that the Supabase project is not paused (free tier pauses after 7 days of inactivity)

### Google OAuth redirects to wrong URL
- Check Supabase → Auth → URL Configuration → Site URL matches your deployment URL
- Check Google Console → Credentials → Authorized redirect URIs includes `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

### API routes return 500
- Run `vercel logs` to see serverless function logs
- Most common: missing environment variables in Vercel dashboard
- Check that `SUPABASE_SERVICE_ROLE_KEY` is set (without `VITE_` prefix)

### Modal endpoint returns CORS error
- The frontend should NOT call Modal directly — it calls `/api/train` (same origin)
- If you see CORS errors, you're accidentally calling the Modal URL from the browser

### Modal OOM during training
- Enable 4-bit quantization
- Reduce batch size to 1
- Reduce LoRA rank (8 instead of 16)
- Use a smaller model

### Supabase free tier limits
- 500MB database storage (plenty for experiments and JSON results)
- 2GB file storage (not used unless you add file uploads)
- 50,000 monthly active users (more than enough)
- Database pauses after 7 days inactivity — just visit the dashboard to unpause

### Modal free tier limits
- $30/month in compute credits
- A single 12B LoRA fine-tune with TracIn costs ~$1–3
- That's roughly 10-30 experiments per month on the free tier
- Users who need more can upgrade their Modal account

### Claude Code agents not invoking
- Run `claude agents` to verify they're loaded
- Restart the session if you just added new agent files
- Try explicit invocation: `Use the frontend-dev subagent to...`
