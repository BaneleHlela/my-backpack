# My Backpack

A digital backpack app — an education platform with multiple mini-apps (vocab, math, engineering subjects, etc.). 
Designed for multiple age groups, starting with an adult user (27) and child users (4–5 years old).

## Tech Stack

- **Monorepo**: pnpm workspaces
- **Backend**: Node.js + Express + TypeScript (`apps/api`)
- **Web**: React + Vite + TypeScript + Redux (`apps/web`)
- **Mobile**: React Native + Expo + TypeScript + Redux (`apps/mobile`)
- **Shared types**: `packages/shared`
- **Database**: MongoDB Atlas (Mongoose ODM)
- **Cache**: Redis via Upstash
- **Auth**: JWT (short-lived access token + long-lived refresh token in HTTP-only cookie)

## Folder Structure
my-backpack/

├── apps/

│   ├── api/        # Express API

│   ├── web/        # React web app

│   └── mobile/     # React Native (Expo)

├── packages/

│   └── shared/     # Shared TypeScript types and utilities
│   └── ui/     # Shared UI components (if needed)
├── pnpm-workspace.yaml

└── CLAUDE.md

## Conventions

- TypeScript strict mode everywhere
- All API routes follow REST conventions
- API modules are organised by feature (auth, profile, vocab, etc.)
- Shared types live in `packages/shared` and are imported by all apps
- Environment variables go in `.env` files (never committed to git)
- No `any` types — use proper TypeScript types always

## Current Progress

- [x] Monorepo initialized with pnpm workspaces
- [x] Folder structure created
- [x] CLAUDE.md created
- [x] Google Cloud Storage bucket set up
- [x] Backend auth system (Account + Profile models, JWT, Passport, OAuth2 scaffold)
- [ ] Web auth UI (login, register, forgot password, reset password, email verification)
- [ ] Mobile auth UI
- [ ] Profile management screens (create, edit, delete, PIN)
- [ ] Vocab mini-app


## Core Concept: Account → Profiles

One Account handles authentication (email, password, OAuth). An Account can have multiple Profiles (max 6). Each Profile is what actually uses the app with its own progress, settings, and age-appropriate content. Think Netflix-style profile switching.

- Account owner logs in → sees profile selector → selects profile → gets full access token
- Child profiles can be PIN-protected to prevent switching
- Only the owner profile can create, edit, or delete other profiles

## Auth Flow

1. Register/Login → returns partial JWT (accountId only) + refresh token in HTTP-only cookie
2. Select profile → returns full JWT (accountId + profileId + ageGroup)
3. All protected routes require the full JWT
4. Access token expires in 15 minutes, refresh token in 7 days

## Key Models

**Account** — authentication only (email, password, OAuth providers, profile refs)

**Profile** — app usage (displayName, ageGroup, education, preferences, progress, optional PIN)

## Education Levels

South African system: grade-r through grade-12, then certificate, diploma, bachelors, honours, masters, phd, professional, other.

## Age Groups

- `child` (4–5 years old) — simplified UI, basic vocabulary, guided interactions
- `teen` — intermediate content
- `adult` — full feature access

The `ageGroup` is embedded in the full JWT so every API endpoint knows which content to serve without an extra DB lookup.

## Asset Storage (Google Cloud Storage)

Bucket: `my-backpack-assets`
my-backpack-assets/

├── branding/

│   ├── logos/

│   └── icons/

├── wallpapers/

│   ├── square/

│   ├── portrait/

│   └── landscape/

├── ui/

│   └── illustrations/

└── content/

└── vocab/

## Mini-Apps Planned

- Vocab (starting here — for adult and child age groups)
- Math
- Engineering subjects (one per course)
- More TBD


## Notes for Claude

- We are not scaling yet — keep solutions simple and straightforward
- Always use TypeScript, never plain JavaScript
- When creating new API modules, follow the same structure as the auth module
- Free hosting only for now: Vercel (web), Render (api), MongoDB Atlas, Upstash (Redis), Google Cloud Storage (assets)
- Education levels follow the South African schooling system
- Always check ageGroup from the JWT when serving content — never skip this
- Max 6 profiles per account — enforce this at the service level
- Never store plain text passwords or PINs — always bcrypt
