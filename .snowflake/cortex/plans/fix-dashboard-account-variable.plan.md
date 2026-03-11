# Plan: Fix Dashboard Account Variable

## Problem
The dashboard route has hardcoded account names instead of using the `SNOWFLAKE_ACCOUNT` environment variable that gets set via the config app during deployment.

## Changes to [app/api/dashboard/route.ts](app/api/dashboard/route.ts)

### 1. Fix `generateJwtToken()` (line 34-36)

**Current (hardcoded):**
```typescript
const user = (process.env.SNOWFLAKE_USER || "admin").toUpperCase();
const privateKey = getPrivateKey();
const qualifiedAccountName = "SFSEEUROPE-EU_DEMO86C";
```

**Change to (dynamic, matching [customerId]/route.ts pattern):**
```typescript
const user = (process.env.SNOWFLAKE_USER || "admin").toUpperCase();
const privateKey = getPrivateKey();
const account = process.env.SNOWFLAKE_ACCOUNT || "";
const qualifiedAccountName = account.replace(/-/g, "_").replace(/\./g, "_").toUpperCase();
```

### 2. Fix `getAccountBaseUrl()` fallback (line 61)

**Current (hardcoded):**
```typescript
return "https://SFSEEUROPE-EU_DEMO86C.snowflakecomputing.com";
```

**Change to (dynamic):**
```typescript
const account = process.env.SNOWFLAKE_ACCOUNT || "";
return `https://${account}.snowflakecomputing.com`;
```

## Authentication Method
**NO CHANGES** to the authentication method - keeping it exactly as is:
- SPCS OAuth: `Snowflake Token="${oauthToken}"`
- Local JWT: `Bearer ${jwtToken}` with `KEYPAIR_JWT` header

## After Code Changes
1. Rebuild Docker image with tag `v3`
2. Push to registry
3. Update service to use new image