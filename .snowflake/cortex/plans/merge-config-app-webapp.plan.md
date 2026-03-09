# Plan: Merge Config-App into Main Webapp (PAT Auth Only)

## Overview
Merge the config-app into the main webapp. The setup wizard will:
- **Only accept PAT (Programmatic Access Token)** - no other auth methods
- Store the PAT securely as a **Snowflake Secret**
- Mount the secret in SPCS for SQL API authentication

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Setup Wizard                                  │
│    User enters PAT in the Snowflake configuration step          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  Store PAT as         │
              │  Snowflake Secret     │
              │  (CREATE SECRET)      │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  Mount Secret in      │
              │  SPCS Container       │
              │  (/snowflake/pat)     │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  Dashboard API reads  │
              │  PAT from mounted     │
              │  secret file          │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  SQL API Request:     │
              │  Authorization:       │
              │  Bearer <PAT>         │
              │                       │
              │  Token-Type:          │
              │  PROGRAMMATIC_ACCESS_ │
              │  TOKEN                │
              └───────────────────────┘
```

## Implementation Plan

### Task 1: Create setup route group with pages

Create wizard pages (simplified for PAT-only):
```
app/(setup)/
├── layout.tsx
├── branding/page.tsx
├── snowflake/page.tsx    # Account + PAT entry (no other auth options)
├── data/page.tsx
├── deploy/page.tsx
└── test/page.tsx
```

The Snowflake page will have:
- Account name input
- User input
- **PAT input field** (password type, masked)
- Database/Schema/Warehouse inputs

### Task 2: Create API to store PAT as Snowflake Secret

Create `/api/setup/save-pat` endpoint that:
```sql
-- Create secret to store PAT
CREATE OR REPLACE SECRET CUSTOMER_360_DEMO.PUBLIC.C360_PAT
  TYPE = GENERIC_STRING
  SECRET_STRING = '<user_entered_pat>';

-- Grant usage to service role
GRANT READ ON SECRET CUSTOMER_360_DEMO.PUBLIC.C360_PAT TO ROLE C360_ROLE;
```

### Task 3: Update SPCS spec to mount PAT secret

Update `spcs-spec.yaml`:
```yaml
spec:
  containers:
    - name: c360-app
      secrets:
        - snowflakeSecret: CUSTOMER_360_DEMO.PUBLIC.C360_PAT
          secretKeyRef: secret_string
          envVarName: SNOWFLAKE_PAT
      # OR mount as file:
      # volumes:
      #   - name: pat-secret
      #     source: "@CUSTOMER_360_DEMO.PUBLIC.C360_PAT"
      #     mountPath: /snowflake/pat
```

### Task 4: Update Dashboard API to use PAT

Modify `app/api/dashboard/route.ts`:
```typescript
async function getAuthHeaders(): Promise<Record<string, string>> {
  // Read PAT from environment variable (mounted from secret)
  const pat = process.env.SNOWFLAKE_PAT;
  
  if (!pat) {
    throw new Error("PAT not configured. Please run Setup wizard.");
  }
  
  return {
    "Authorization": `Bearer ${pat}`,
    "X-Snowflake-Authorization-Token-Type": "PROGRAMMATIC_ACCESS_TOKEN",
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
}
```

### Task 5: Copy remaining config-app files

- Components: `stepper.tsx`
- Lib files: `constants.ts`, `config-store.ts`
- API routes (updated for PAT workflow)

### Task 6: Create setup layout with stepper

Create `app/(setup)/layout.tsx` with:
- Header and Stepper navigation
- "Back to App" link

### Task 7: Add Setup button to homepage sidebar

Add "Setup" button at bottom-left of sidebar in `chat-interface.tsx`

### Task 8: Merge CSS styles

Add config-app styles to `globals.css`

### Task 9: Test PAT authentication flow

Verify:
1. User can enter PAT in setup wizard
2. PAT is stored as Snowflake Secret
3. SPCS service mounts the secret
4. Dashboard API authenticates using PAT
5. SQL queries execute successfully

## Security Considerations

- PAT is **never stored in code** or environment files
- PAT is stored as a **Snowflake Secret** (encrypted at rest)
- Secret is mounted into container at runtime
- PAT input field is masked (password type)
- PAT is not logged or exposed in responses

## Files Changed

**New Files**:
- `app/(setup)/**` - Setup wizard pages
- `app/api/setup/save-pat/route.ts` - Store PAT as secret
- `components/setup/stepper.tsx`
- `lib/setup/*`

**Modified Files**:
- `app/api/dashboard/route.ts` - Use PAT auth
- `spcs-spec.yaml` - Mount PAT secret
- `components/chat-interface.tsx` - Add Setup button
- `app/globals.css` - Config-app styles
