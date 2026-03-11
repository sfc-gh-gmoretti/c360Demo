# Plan: Recreate Config-App from Main App Setup

## Overview

Delete the current config-app and create a new standalone app by copying the `/app/setup/` pages and `/app/api/setup/` routes from the main webapp.

## Implementation

### Task 1: Backup and delete existing config-app

```bash
rm -rf config-app
```

### Task 2: Create new config-app structure

Create the new Next.js app structure:

```
config-app/
├── app/
│   ├── layout.tsx          # Root layout (from setup/layout.tsx)
│   ├── page.tsx            # Redirect to /branding
│   ├── branding/page.tsx   # Copy from app/setup/branding/page.tsx
│   ├── snowflake/page.tsx  # Copy from app/setup/snowflake/page.tsx
│   ├── data/page.tsx       # Copy from app/setup/data/page.tsx
│   ├── deploy/page.tsx     # Copy from app/setup/deploy/page.tsx
│   ├── test/page.tsx       # Copy from app/setup/test/page.tsx
│   ├── globals.css         # Standalone styles
│   └── api/                # All API routes
│       ├── test-connection/route.ts
│       ├── check-objects/route.ts
│       ├── run-setup/route.ts
│       ├── generate-data/route.ts
│       ├── verify-data/route.ts
│       ├── deploy/route.ts
│       ├── docker-push/route.ts
│       ├── deploy-model/route.ts
│       ├── get-app-url/route.ts
│       ├── run-network-tests/route.ts
│       ├── list-images/route.ts
│       ├── save-pat/route.ts
│       ├── save-config/route.ts
│       └── register-model/route.ts
├── lib/
│   ├── constants.ts        # Copy from lib/setup/constants.ts
│   ├── snowflake.ts        # Copy from lib/setup/snowflake.ts
│   └── config-store.ts     # Copy from lib/setup/config-store.ts
├── components/
│   └── stepper.tsx         # If needed
├── model/
│   └── cross_sell_model.joblib
├── package.json
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── Dockerfile
├── Dockerfile.dev
├── docker-compose.yml
├── run-local.sh
└── README.md
```

### Task 3: Copy and adapt files

**Pages** - Copy from `app/setup/` and update:
- Change navigation paths from `/setup/X` to `/X`
- Change API paths from `/api/setup/X` to `/api/X`
- Update imports from `@/lib/setup/` to `@/lib/`

**API Routes** - Copy from `app/api/setup/` and update:
- Update imports from `@/lib/setup/` to `@/lib/`

**Lib files** - Copy directly from `lib/setup/`

### Task 4: Create standalone config files

**package.json:**
```json
{
  "name": "customer360-config-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "^0.400.0",
    "snowflake-sdk": "^1.14.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "postcss": "^8.0.0"
  }
}
```

### Task 5: Create Docker and run files

- Copy existing Dockerfile, Dockerfile.dev, docker-compose.yml
- Keep run-local.sh script

### Task 6: Update root layout

Adapt `app/setup/layout.tsx` to be a standalone root layout:
- Remove "Back to App" link
- Add "Powered by Snowflake" footer
- Update title/metadata

### Task 7: Test the new config-app

```bash
cd config-app
npm install
npm run build
./run-local.sh up
```

## Files to Copy

| Source | Destination |
|--------|-------------|
| `app/setup/branding/page.tsx` | `config-app/app/branding/page.tsx` |
| `app/setup/snowflake/page.tsx` | `config-app/app/snowflake/page.tsx` |
| `app/setup/data/page.tsx` | `config-app/app/data/page.tsx` |
| `app/setup/deploy/page.tsx` | `config-app/app/deploy/page.tsx` |
| `app/setup/test/page.tsx` | `config-app/app/test/page.tsx` |
| `app/api/setup/*` (14 routes) | `config-app/app/api/*` |
| `lib/setup/constants.ts` | `config-app/lib/constants.ts` |
| `lib/setup/snowflake.ts` | `config-app/lib/snowflake.ts` |
| `lib/setup/config-store.ts` | `config-app/lib/config-store.ts` |

## Path Updates Required

All copied files need these replacements:
- `/setup/branding` → `/branding`
- `/setup/snowflake` → `/snowflake`
- `/setup/data` → `/data`
- `/setup/deploy` → `/deploy`
- `/setup/test` → `/test`
- `/api/setup/` → `/api/`
- `@/lib/setup/` → `@/lib/`
