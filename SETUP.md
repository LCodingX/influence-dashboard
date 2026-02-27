# Influence Dashboard — Setup Guide

## Prerequisites

- **Node.js 18+** and **npm**
- **Python 3.10+** (for the RunPod worker Docker image, optional for local dev)
- **Git**
- A **Google account** (for Google OAuth setup)

### Accounts needed (all have free tiers)

| Service | Purpose | Sign up |
|---------|---------|---------|
| **Supabase** | Auth + Postgres database | https://supabase.com |
| **Vercel** | Frontend hosting + serverless API | https://vercel.com |
| **RunPod** | GPU compute (each researcher uses their own key) | https://runpod.io |

---

## 1. Supabase Setup (Auth + Database)

### Create a project

1. Go to https://supabase.com → **New Project**
2. Name it `influence-dashboard`, set a database password, pick a region
3. Wait ~2 minutes for provisioning

### Get your keys

In the Supabase dashboard → **Settings → API Keys**:

| Key | What it is | Where it goes |
|-----|-----------|---------------|
| Project URL | `https://abcdefg.supabase.co` | `VITE_SUPABASE_URL` |
| Publishable key | Starts with `sb_publishable_...` | `VITE_SUPABASE_PUBLISHABLE_KEY` |
| Secret key | Starts with `sb_secret_...` — **keep secret** | `SUPABASE_SECRET_KEY` |

### Enable Google OAuth

1. Supabase dashboard → **Authentication → Providers → Google** → toggle **Enable**
2. Go to https://console.cloud.google.com → **APIs & Services → Credentials**
3. Create an **OAuth 2.0 Client ID** (Web application)
4. Add authorized redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
5. Copy the Client ID and Client Secret into the Supabase Google provider settings
6. Save

### Enable Email/Password auth

Enabled by default. Optionally in **Authentication → Settings**:
- Toggle "Confirm email" off for easier development
- Set minimum password length

### Run the database migrations

1. Go to Supabase dashboard → **SQL Editor**
2. Paste and run `supabase/migrations/001_initial_schema.sql`
3. Paste and run `supabase/migrations/002_runpod_backend.sql`
4. Verify tables in **Table Editor**: `profiles`, `experiments`, `jobs`

### Configure redirect URLs

In **Authentication → URL Configuration**:
- **Site URL**: `http://localhost:5173` (change to your Vercel URL after deploy)
- **Redirect URLs**: Add all of these:
  - `http://localhost:3000`
  - `http://localhost:5173`
  - `https://your-app.vercel.app` (add after Vercel deploy)
  - `https://your-app.vercel.app/**`

---

## 2. Generate Encryption Secret

The dashboard encrypts user RunPod API keys at rest. Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Save the output — this becomes `RUNPOD_KEY_ENCRYPTION_SECRET`.

---

## 3. Local Development

### Install dependencies

```bash
cd influence-dashboard
npm install
```

### Create `.env.local`

```bash
# Supabase (public — safe for browser)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# Supabase (private — server-side only)
SUPABASE_SECRET_KEY=sb_secret_...

# Encryption key for storing user RunPod API keys
RUNPOD_KEY_ENCRYPTION_SECRET=your_64_char_hex_string
```

### Run the frontend

```bash
npm run dev
# Opens at http://localhost:5173
```

For frontend + Vercel API routes together:

```bash
npx vercel dev
# Opens at http://localhost:3000
```

### Test the auth flow

1. Open the app in your browser
2. Sign up with email or Google
3. You'll be prompted to enter a RunPod API key
4. Enter your key from https://runpod.io/console/user/settings
5. Once verified, you'll be redirected to the dashboard

---

## 4. RunPod Worker (Docker Image)

The RunPod serverless worker is the GPU backend that runs training jobs. It needs to be published as a Docker image.

### Build locally (for testing)

```bash
docker build -f runpod_worker/Dockerfile -t influence-worker .
```

### Publish to GitHub Container Registry

Push to your repo's `main` branch — the GitHub Actions workflow (`.github/workflows/publish-worker.yml`) automatically builds and pushes the image to `ghcr.io/your-org/influence-worker:latest`.

Or push manually:

```bash
docker tag influence-worker ghcr.io/YOUR_GITHUB_USER/influence-worker:latest
docker push ghcr.io/YOUR_GITHUB_USER/influence-worker:latest
```

### Create a RunPod Serverless Template

1. Go to https://runpod.io/console/serverless → **Templates → New Template**
2. Set Docker image to `ghcr.io/YOUR_GITHUB_USER/influence-worker:latest`
3. Configure:
   - Container disk: **20 GB**
   - GPU type: **AMPERE_80** (A100 80GB) or your preferred tier
   - Execution timeout: **7200** seconds (2 hours, for long training runs)
4. Save the template — note the **Template ID**

---

## 5. Deploy to Vercel

### First deploy

```bash
vercel
# Follow the prompts:
# - Link to your Vercel account
# - Create a new project
# - Accept the detected settings (Vite framework)
```

### Set environment variables

In the Vercel dashboard → your project → **Settings → Environment Variables**:

| Variable | Value | Required |
|----------|-------|----------|
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | Yes |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` | Yes |
| `SUPABASE_SECRET_KEY` | `sb_secret_...` | Yes |
| `RUNPOD_KEY_ENCRYPTION_SECRET` | 64-char hex string | Yes |
| `RUNPOD_TEMPLATE_ID` | Template ID from step 4 | Yes |

### Production deploy

```bash
vercel --prod
```

### Update Supabase redirect URLs

After deploy, add your Vercel URL to Supabase:
- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: `https://your-app.vercel.app` and `https://your-app.vercel.app/**`

Also verify the Google OAuth redirect URI in Google Cloud Console includes `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`.

---

## 6. End-to-End Test

1. Visit your deployed URL
2. Sign in with Google or email
3. Enter your RunPod API key when prompted
4. Enter 2-3 training QA pairs (right panel)
5. Enter 1-2 evaluation questions (left panel)
6. Select a small model (Gemma 3 1B) for a fast test
7. Set epochs to 5, influence method to TracIn
8. Click **Train & Compute Influence**
9. Watch the progress bar update
10. Verify results: three-way comparison + influence heatmap

---

## Troubleshooting

### "Invalid API key" on sign-in
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are correct
- Both must have the `VITE_` prefix to be available in the browser
- Check that the Supabase project is not paused (free tier pauses after 7 days of inactivity)

### Google OAuth redirects to wrong URL
- Supabase → Auth → URL Configuration → Site URL must match your deployment
- Google Console → Credentials → Authorized redirect URIs must include `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

### API routes return 500
- Run `vercel logs` to check serverless function logs
- Most common cause: missing environment variables in Vercel dashboard
- Ensure `SUPABASE_SECRET_KEY` is set (without `VITE_` prefix)

### RunPod API key validation fails
- Check that the key is valid at https://runpod.io/console/user/settings
- Ensure the key has not been revoked
- Ensure your RunPod account has credits

### RunPod job fails with OOM
- Enable 4-bit quantization in the hyperparameters
- Reduce batch size to 1
- Reduce LoRA rank (8 instead of 16)
- Use a smaller model

### RunPod cold start is slow
- First request to a serverless endpoint can take 30-120 seconds
- Subsequent requests are faster while the worker is warm
- The worker idles out after ~5 minutes of inactivity

### Supabase free tier limits
- 500 MB database storage (sufficient for experiments and JSON results)
- 50,000 monthly active users
- Database pauses after 7 days of inactivity — visit the dashboard to unpause

### RunPod pricing
- A10 (24 GB): ~$1.12/hr — good for models up to 3B
- L40S (48 GB): ~$2.48/hr — good for 7-12B models
- A100 (80 GB): ~$5.00/hr — good for 13B+ models
- Billing is per-second of actual GPU usage (serverless)
