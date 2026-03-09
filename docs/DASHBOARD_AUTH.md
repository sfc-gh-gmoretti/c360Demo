# Dashboard Authentication Documentation

## Overview

This document describes how the Customer 360 Dashboard authenticates to Snowflake and which database objects it accesses.

## Account Configuration

| Setting | Value |
|---------|-------|
| **Account** | `sfseeurope-eu-demo86c` |
| **Host** | `sfseeurope-eu-demo86c.snowflakecomputing.com` |
| **Database** | `CUSTOMER_360_DEMO` |
| **Schema** | `PUBLIC` |
| **Warehouse** | `C360_WH` |
| **User** | `admin` |

## Environment Variables

The following environment variables are set in the SPCS service specification (`spcs-spec.yaml`):

```yaml
env:
  SNOWFLAKE_ACCOUNT: "sfseeurope-eu-demo86c"
  SNOWFLAKE_USER: "admin"
  SNOWFLAKE_DATABASE: "CUSTOMER_360_DEMO"
  SNOWFLAKE_SCHEMA: "PUBLIC"
  SNOWFLAKE_WAREHOUSE: "C360_WH"
  SNOWFLAKE_HOST: "sfseeurope-eu-demo86c.snowflakecomputing.com"
```

## Authentication Flow

The dashboard authenticates directly to Snowflake using **Key-Pair JWT authentication**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Dashboard API Request                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  Read Private Key     │
              │  from container       │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  Generate JWT Token   │
              │  - RS256 algorithm    │
              │  - 1 hour expiry      │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │  Authorization:       │
              │  Bearer <jwt>         │
              │                       │
              │  Token-Type:          │
              │  KEYPAIR_JWT          │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Snowflake SQL API   │
              │   /api/v2/statements  │
              └───────────────────────┘
```

### Key-Pair JWT Authentication

The dashboard authenticates to Snowflake (not SPCS) using key-pair JWT:

1. Reads private key from the container (path specified in `SNOWFLAKE_PRIVATE_KEY_PATH` or default `/app/.snowflake/keys/rsa_key.p8`)
2. Generates JWT token with:
   - Issuer: `<ACCOUNT>.<USER>.<KEY_FINGERPRINT>`
   - Subject: `<ACCOUNT>.<USER>`
   - Algorithm: RS256
   - Expiry: 1 hour
3. Sends request to Snowflake SQL API with headers:
   - `Authorization: Bearer <jwt_token>`
   - `X-Snowflake-Authorization-Token-Type: KEYPAIR_JWT`

### Required Setup

For this authentication to work, the container must have:
1. A private key file mounted at the expected path
2. The corresponding public key registered with the Snowflake user (`admin`)

## SQL API Endpoint

All queries are sent to:
```
https://{SNOWFLAKE_HOST}/api/v2/statements
```

Request body includes:
```json
{
  "statement": "<SQL>",
  "timeout": 60,
  "database": "CUSTOMER_360_DEMO",
  "schema": "PUBLIC",
  "warehouse": "C360_WH"
}
```

## Tables Accessed

The dashboard queries the following tables in `CUSTOMER_360_DEMO.PUBLIC`:

| Table | Columns Used | Purpose |
|-------|--------------|---------|
| `CUSTOMER_DEMOGRAPHICS` | `AGE_GROUP`, `INCOME_BRACKET`, `TOTAL_PENSION_VALUE`, `CUSTOMER_ID` | Age distribution, income brackets, pension totals |
| `CUSTOMER_PENSION_DETAILS` | `PENSION_TYPE`, `FUND_VALUE`, `CUSTOMER_ID` | Pension type distribution, fund values |
| `CUSTOMER_INTERACTION_AND_LEADS` | `MARKETING_CHANNEL` | Marketing channel analytics |
| `CUSTOMER_COMMUNICATION` | `PREFERRED_CHANNEL` | Communication preference distribution |

## Dashboard Data Structure

The API returns data in this structure:

```typescript
{
  demographics: {
    ageGroups: Array<{name: string, value: number}>,
    regions: Array<{name: string, value: number}>,
    totalCustomers: number
  },
  products: {
    distribution: Array<{name: string, value: number}>,
    topProducts: Array<{name: string, count: number}>
  },
  engagement: {
    channels: Array<{name: string, value: number}>,
    preferences: Array<{name: string, value: number}>,
    recentActivity: Array<{date: string, interactions: number}>
  },
  financial: {
    totalPensionValue: number,
    avgPensionValue: number,
    totalPolicyValue: number,
    valueBySegment: Array<{segment: string, value: number}>
  }
}
```

## Current Issue

### Private Key Not Mounted in Container

**Status**: Unresolved

**Error Message**:
```
Private key not found at /app/.snowflake/keys/rsa_key.p8
```

**Cause**: The container does not have a private key file mounted, so key-pair JWT authentication fails.

**Required Fix**: Mount a private key in the SPCS container specification and ensure the corresponding public key is registered with the Snowflake user.

## Related Files

- `app/api/dashboard/route.ts` - Dashboard API implementation
- `spcs-spec.yaml` - SPCS service specification
- `lib/snowflake.ts` - Snowflake connection utilities
