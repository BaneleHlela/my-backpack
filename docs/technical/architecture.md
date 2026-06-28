# System Architecture

My Backpack is a monorepo containing three applications sharing a common type system. The backend is a REST API backed by MongoDB. The frontends (web and mobile) consume that API over HTTP with JWT authentication. This document describes the full system structure, technology choices, and data flow.

---

## Monorepo Structure

The project uses **pnpm workspaces** to manage multiple packages in a single repository. This allows the API, web app, and mobile app to share types without publishing a package to npm.

```
my-backpack/
├── apps/
│   ├── api/          ← Express API (Node.js + TypeScript)
│   ├── web/          ← React + Vite (TypeScript)
│   └── mobile/       ← React Native + Expo (TypeScript)
├── packages/
│   └── shared/       ← Shared TypeScript types and utilities
├── pnpm-workspace.yaml
└── package.json
```

The three apps communicate at runtime via HTTP (the API is a server; web and mobile are clients). At build time, all three import from `packages/shared` for type safety without duplication.

---

## The Three Apps

### `apps/api` — The Backend

- **Runtime:** Node.js 20+
- **Framework:** Express 4
- **Language:** TypeScript (strict mode)
- **Database ORM:** Mongoose (MongoDB)
- **Cache client:** ioredis (Upstash Redis)
- **Auth:** Passport.js (local, Google OAuth2, Facebook OAuth2), JWT
- **AI client:** Anthropic SDK (`@anthropic-ai/sdk`)
- **Storage client:** `@google-cloud/storage`

The API is structured by feature module:

```
apps/api/src/
├── config/       ← Database, Redis, Passport configuration
├── middleware/   ← Age group filter, auth guards
├── models/       ← Mongoose schemas (core/, learning/, apps/)
├── modules/      ← Feature modules (auth, profile, vocab, quiz, roadmap, admin, question, content)
├── services/     ← Cross-module business logic (adaptive learning, quiz session, question generation)
├── utils/        ← AppError, response helper, JWT utilities
├── scripts/      ← CLI scripts (generateQuestions, cleanupQuestions)
├── seed.ts       ← Database seeder
└── app.ts        ← Express app entry point
```

### `apps/web` — The Web Frontend

- **Framework:** React 18 + Vite
- **Language:** TypeScript (strict mode)
- **State management:** Redux Toolkit
- **HTTP client:** Axios with interceptors
- **Routing:** React Router v6
- **Styling:** Tailwind CSS

### `apps/mobile` — The Mobile App

- **Framework:** React Native + Expo
- **Language:** TypeScript (strict mode)
- **State management:** Redux Toolkit
- **Status:** Deferred until the web frontend is further along

### `packages/shared` — Shared Types and Utilities

Contains TypeScript interfaces, types, enums, constants, and utility functions shared by all three apps. Importing from `packages/shared` ensures that the API's response shapes and the frontend's expectations are always in sync.

Key exports:
- `types/` — interfaces for all models (Account, Profile, Term, Question, etc.)
- `constants/assets.ts` — public GCS asset URLs
- `utils/resolveHelpers.ts` — merges default question helpers with per-node overrides

---

## Technology Choices

| Technology | Role | Reason |
|---|---|---|
| Node.js + Express | API server | Lightweight, fast to build, TypeScript support excellent |
| MongoDB Atlas | Primary database | Flexible schema for rapidly evolving content models, free tier |
| Mongoose | ODM | Schema validation at application level, TypeScript support |
| Upstash Redis | Cache and session store | Serverless Redis, generous free tier (10,000 commands/day) |
| JWT | Authentication | Stateless, works with mobile and web without session affinity |
| Passport.js | OAuth2 | Handles Google and Facebook strategies cleanly |
| React + Vite | Web frontend | Fast dev experience, modern build tooling |
| React Native + Expo | Mobile | Share logic with web via shared package, Expo simplifies builds |
| Redux Toolkit | State management | Predictable state, good TypeScript support |
| Anthropic Claude Haiku | AI question generation | Fast, cheap, accurate enough for vocabulary question generation |
| Google Cloud Storage | Asset storage | Reliable, cheap, geographically close (africa-south1) |
| pnpm workspaces | Monorepo tooling | Fast installs, easy cross-package imports |

---

## How the Apps Communicate

All communication between clients and the API happens over **HTTP with JSON**. The web and mobile apps make requests to the API. There is no direct database access from the frontend.

### Authentication Flow

1. Client sends credentials → API validates → returns a **partial JWT** (contains `accountId` only) + a **refresh token** in an HTTP-only cookie
2. Client selects a profile → API validates → returns a **full JWT** (contains `accountId`, `profileId`, `ageGroup`)
3. All protected API routes require the full JWT in the `Authorization: Bearer <token>` header
4. Access token expires in 15 minutes; refresh token expires in 7 days
5. Client uses the refresh token (cookie) to obtain a new access token silently

### API URL Structure

All routes are prefixed with `/api/`:

```
/api/auth/...
/api/profiles/...
/api/content/...
/api/vocab/...
/api/quiz/...
/api/roadmap/...
/api/admin/...
```

---

## Data Flow Diagram

```
Browser / Mobile App
        │
        │  HTTP + JWT
        ▼
  Express API (Render)
        │
        ├──────────────────► MongoDB Atlas
        │                    (primary data: users, content, learning records)
        │
        ├──────────────────► Upstash Redis
        │                    (caching, rate limiting)
        │
        ├──────────────────► Google Cloud Storage
        │                    (audio files, images, branding assets)
        │
        └──────────────────► Anthropic API
                             (question generation — async, not on critical path)
```

The Anthropic API is called asynchronously during question generation, not in the request path of normal user interactions. A vocabulary term is seeded or added to the database; question generation runs in the background.

---

## Free Hosting Setup

My Backpack runs entirely on free-tier services during the current phase. This is a deliberate choice to validate the product before incurring costs.

| Service | Platform | Free Tier Limitations |
|---|---|---|
| API | Render | Spins down after 15 minutes of inactivity; cold start ~30 seconds |
| Web frontend | Vercel | No practical limits for this scale |
| Database | MongoDB Atlas | 512MB storage limit |
| Cache | Upstash | 10,000 Redis commands/day |
| Asset storage | Google Cloud Storage | 5GB storage, 1GB egress/month free |
| Mobile testing | Expo Go | No cost for development; EAS Build has a monthly build limit |

The Render sleep behaviour is the most user-visible limitation. The first request after inactivity will be slow. This is acceptable for the current development phase and will be resolved on a paid tier when the product scales.

---

## Environment Variables

The following environment variables are required to run the API. Values are never committed to the repository — see `.env.example` in `apps/api/` for the full list.

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `REDIS_URL` | Upstash Redis connection URL |
| `JWT_SECRET` | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens |
| `GOOGLE_CLIENT_ID` | Google OAuth2 app client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 app client secret |
| `FACEBOOK_APP_ID` | Facebook OAuth2 app ID |
| `FACEBOOK_APP_SECRET` | Facebook OAuth2 app secret |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude (question generation) |
| `GCS_BUCKET_NAME` | Google Cloud Storage bucket name |
| `GCS_PROJECT_ID` | Google Cloud project ID |
| `GCS_KEY_FILE` | Path to GCS service account key JSON |
| `CLIENT_URL` | Frontend URL (for CORS and OAuth redirects) |
| `NODE_ENV` | `development` or `production` |

---

*Last updated: June 2026*
