# Deployment Guide

This document covers everything needed to get My Backpack running locally and deployed to production. The project runs entirely on free-tier services during the current phase.

---

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** v20 or later (`node --version`)
- **pnpm** v8 or later (`npm install -g pnpm`)
- **Git**
- A **MongoDB Atlas** account (free tier)
- An **Upstash** account (free Redis)
- A **Google Cloud** account (for GCS asset storage)
- An **Anthropic** account (for question generation)
- A **Render** account (for API hosting)
- A **Vercel** account (for web hosting)

---

## Local Development Setup

### 1. Clone the repository

```bash
git clone https://github.com/BaneleHlela/my-backpack.git
cd my-backpack
```

### 2. Install dependencies

```bash
pnpm install
```

This installs dependencies for all workspaces: `apps/api`, `apps/web`, `apps/mobile`, and `packages/shared`.

### 3. Set up environment variables

Copy the example env file and fill in your values:

```bash
cp apps/api/.env.example apps/api/.env
```

See the [Environment Variables](#environment-variables) section below for what each variable means.

### 4. Start the API in development mode

```bash
pnpm --filter api dev
```

The API starts on `http://localhost:3000` by default.

### 5. Seed the database

```bash
pnpm --filter api seed
```

This creates the content hierarchy (Fields, Subjects, Topics, MiniApps), seeds vocabulary terms, and creates the IsiZulu sounds roadmap with its nodes and questions.

### 6. Start the web frontend

```bash
pnpm --filter web dev
```

The web app starts on `http://localhost:5173` by default.

### 7. Start the mobile app (optional)

```bash
pnpm --filter mobile dev
```

This starts the Expo dev server. Scan the QR code with **Expo Go** on your phone to run on device.

---

## Environment Variables

All variables live in `apps/api/.env`. Never commit this file to git — it is in `.gitignore`.

| Variable | Purpose | Example |
|---|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/mybackpack` |
| `REDIS_URL` | Upstash Redis connection URL | `rediss://default:token@host.upstash.io:6379` |
| `JWT_SECRET` | Secret for signing access tokens (min 32 chars) | A long random string |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens (min 32 chars) | A different long random string |
| `JWT_EXPIRES_IN` | Access token lifetime | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime | `7d` |
| `GOOGLE_CLIENT_ID` | Google OAuth2 app client ID | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 app client secret | From Google Cloud Console |
| `FACEBOOK_APP_ID` | Facebook OAuth2 app ID | From Facebook Developer Console |
| `FACEBOOK_APP_SECRET` | Facebook OAuth2 app secret | From Facebook Developer Console |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude (question generation) | `sk-ant-...` |
| `GCS_BUCKET_NAME` | Google Cloud Storage bucket | `my-backpack-assets` |
| `GCS_PROJECT_ID` | Google Cloud project ID | From GCS Console |
| `GCS_KEY_FILE` | Path to GCS service account JSON key | `./gcs-key.json` |
| `CLIENT_URL` | Frontend URL for CORS and OAuth redirects | `http://localhost:5173` in dev |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `PORT` | API server port | `3000` |

### Generating secure secrets

Use Node.js to generate random secrets:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Run this twice — once for `JWT_SECRET`, once for `JWT_REFRESH_SECRET`.

---

## Database Seeding

The seed script sets up the full content hierarchy and seeds vocabulary and roadmap content.

```bash
# Full seed
pnpm --filter api seed

# Generate questions for a specific term+definition
pnpm --filter api generate-questions -- --termId=<id> --definitionId=<id>

# Remove all generated questions (reset question bank)
pnpm --filter api cleanup-questions
```

The seed script is idempotent — running it multiple times will not create duplicate data.

---

## MongoDB Atlas Setup

1. Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free **M0** cluster (512MB)
3. Under **Database Access**: create a user with `readWriteAnyDatabase` role
4. Under **Network Access**: add `0.0.0.0/0` to the IP allowlist for development (restrict in production)
5. Click **Connect** → **Drivers** → copy the connection string
6. Replace `<password>` in the connection string with your database user's password
7. Append `/mybackpack` before the query string to specify the database name
8. Set this as `MONGODB_URI` in `.env`

---

## Upstash Redis Setup

1. Sign up at [upstash.com](https://upstash.com)
2. Create a new Redis database (free tier)
3. Choose a region close to your API deployment (e.g. EU Frankfurt for Render)
4. Copy the **Redis URL** (starts with `rediss://`)
5. Set this as `REDIS_URL` in `.env`

Free tier limit: 10,000 commands per day. This is sufficient for development and early production.

---

## Google Cloud Storage Setup

1. Sign up at [cloud.google.com](https://cloud.google.com)
2. Create a project (or use an existing one)
3. Enable the **Cloud Storage API**
4. Create a bucket:
   - Name: `my-backpack-assets`
   - Region: `africa-south1` (Cape Town)
   - Access: **Uniform** access control
5. Under **Permissions**, add `allUsers` as **Storage Object Viewer** to make assets publicly readable
6. Create a **Service Account**:
   - Go to IAM & Admin → Service Accounts
   - Create a new service account
   - Grant it the **Storage Object Admin** role
   - Download the JSON key file
7. Place the key file in `apps/api/` (e.g. `gcs-key.json`) — add to `.gitignore`
8. Set `GCS_KEY_FILE=./gcs-key.json`, `GCS_BUCKET_NAME=my-backpack-assets`, and `GCS_PROJECT_ID` in `.env`

---

## Deploying the API to Render

1. Sign up at [render.com](https://render.com)
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Root directory:** `apps/api`
   - **Build command:** `pnpm install && pnpm build`
   - **Start command:** `node dist/app.js`
   - **Environment:** Node
5. Add all environment variables from your `.env` file under **Environment**
6. For `CLIENT_URL`, use your Vercel web app URL
7. Deploy

**Free tier note:** Render's free tier spins down after 15 minutes of inactivity. The first request after a period of inactivity will take ~30 seconds while the server starts up. This is a known limitation of the free tier.

---

## Deploying the Web App to Vercel

1. Sign up at [vercel.com](https://vercel.com)
2. Click **New Project** → import your GitHub repository
3. Configure:
   - **Framework preset:** Vite
   - **Root directory:** `apps/web`
   - **Build command:** `pnpm build`
   - **Output directory:** `dist`
4. Add environment variable:
   - `VITE_API_URL` → your Render API URL (e.g. `https://my-backpack-api.onrender.com`)
5. Deploy

---

## Deploying the Mobile App with Expo

### Development testing (Expo Go)

1. Install **Expo Go** on your Android or iOS device
2. Run `pnpm --filter mobile dev`
3. Scan the QR code — the app loads on your device

### Production build (EAS Build)

1. Install the EAS CLI: `npm install -g eas-cli`
2. Log in: `eas login`
3. Configure: `eas build:configure`
4. Build for Android: `eas build --platform android`
5. Build for iOS: `eas build --platform ios` (requires Apple Developer account)

The free EAS tier has a monthly build limit. For development, Expo Go is sufficient.

---

## Common Deployment Issues

### API is slow on first request
Expected behaviour on Render's free tier. The server sleeps after 15 minutes of inactivity. No action needed — it wakes up automatically on the next request.

### `MongoServerError: Authentication failed`
Check that the password in `MONGODB_URI` matches your Atlas database user's password. Special characters in passwords must be URL-encoded.

### `Error: CORS policy`
Check that `CLIENT_URL` in the API's environment matches the exact URL of your web app (including `https://` and no trailing slash).

### `Error: Could not load the default credentials`
The GCS service account key file is not found. Check that `GCS_KEY_FILE` points to the correct path relative to where the API starts. In production on Render, use the environment variable `GOOGLE_APPLICATION_CREDENTIALS` instead of a file path.

### `Redis connection refused`
Check that `REDIS_URL` starts with `rediss://` (with double s for TLS). Upstash requires TLS.

### Seed script fails with duplicate key error
The seed script has already been run. This is safe to ignore — the script uses `upsert` operations where possible. Run `pnpm --filter api cleanup-questions` only if you need to reset the question bank.

---

*Last updated: June 2026*
