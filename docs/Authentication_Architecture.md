# Customer 360 Authentication Architecture

This document describes the authentication mechanisms used across the Customer 360 application, covering all three main data access patterns: the Chat/Cortex Agent, Dashboard SQL API, and Customer Search functionality.

---

## Table of Contents

1. [Overview](#overview)
2. [Dual Authentication Strategy](#dual-authentication-strategy)
3. [Chat Interface - Cortex Agent Authentication](#chat-interface---cortex-agent-authentication)
4. [Dashboard - SQL API Authentication](#dashboard---sql-api-authentication)
5. [Customer Search Bar Authentication](#customer-search-bar-authentication)
6. [Authentication Flow Diagrams](#authentication-flow-diagrams)
7. [Security Considerations](#security-considerations)

---

## Overview

The Customer 360 application supports **two deployment environments** with different authentication mechanisms:

| Environment | Authentication Method | Token Location |
|-------------|----------------------|----------------|
| **SPCS (Snowpark Container Services)** | OAuth Token | `/snowflake/session/token` |
| **Local Development** | JWT Key-Pair | `~/.snowflake/keys/rsa_key.p8` |

The application automatically detects the environment and uses the appropriate authentication method.

---

## Dual Authentication Strategy

All API routes in the application follow the same pattern to determine which authentication method to use:

```typescript
function getOAuthToken(): string | null {
  const tokenPath = "/snowflake/session/token";
  try {
    if (fs.existsSync(tokenPath)) {
      return fs.readFileSync(tokenPath, "utf8");
    }
  } catch {
    // Not in SPCS environment
  }
  return null;
}
```

### Decision Logic

1. **Check for SPCS OAuth token** at `/snowflake/session/token`
2. If token exists → Use OAuth authentication
3. If no token → Fall back to JWT Key-Pair authentication

---

## Chat Interface - Cortex Agent Authentication

**File:** `lib/cortex-agent.ts`  
**Endpoint:** `POST /api/agent`  
**Target:** Snowflake Cortex Agent REST API

### Authentication Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────────┐
│  Chat Frontend  │────▶│  /api/agent      │────▶│  Cortex Agent REST API  │
│  (SSE Stream)   │     │  (Next.js API)   │     │  /api/v2/.../agents:run │
└─────────────────┘     └──────────────────┘     └─────────────────────────┘
```

### JWT Token Generation (Local Development)

The Cortex Agent library generates JWT tokens using RSA key-pair authentication:

```typescript
function generateJwtToken(): string {
  // Cache check for existing valid token
  if (cachedJwtToken && Date.now() < tokenExpiry) {
    return cachedJwtToken;
  }

  const user = (process.env.SNOWFLAKE_USER || "admin").toUpperCase();
  const privateKey = getPrivateKey();
  const qualifiedAccountName = "SFSEEUROPE-EU_DEMO86";

  // Generate public key fingerprint from private key
  const privateKeyObj = crypto.createPrivateKey(privateKey);
  const publicKeyDer = crypto.createPublicKey(privateKeyObj)
    .export({ type: "spki", format: "der" });
  const fingerprint = crypto.createHash("sha256")
    .update(publicKeyDer).digest("base64");
  const publicKeyFingerprint = `SHA256:${fingerprint}`;

  // Build JWT payload
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: `${qualifiedAccountName}.${user}.${publicKeyFingerprint}`,
    sub: `${qualifiedAccountName}.${user}`,
    iat: now,
    exp: now + 3600,  // 1 hour expiry
  };

  // Sign with RS256 algorithm
  cachedJwtToken = jwt.sign(payload, privateKey, { algorithm: "RS256" });
  tokenExpiry = (now + 3500) * 1000;  // Cache for 58 minutes
  return cachedJwtToken;
}
```

### HTTP Headers

**For JWT Authentication:**
```http
Authorization: Bearer <jwt_token>
X-Snowflake-Authorization-Token-Type: KEYPAIR_JWT
Content-Type: application/json
Accept: text/event-stream
User-Agent: AvivaCustomer360/1.0
```

### API Request

```typescript
const response = await fetch(url, {
  method: "POST",
  headers: {
    ...headers,
    "Accept": "text/event-stream",
  },
  body: JSON.stringify({
    messages,
    stream: true,
    experimental: {
      enable_thinking: true,
    },
  }),
});
```

### Response Handling

The agent returns Server-Sent Events (SSE) which are streamed to the frontend:

```typescript
const stream = new ReadableStream({
  async start(controller) {
    for await (const event of agentStream) {
      const data = `data: ${JSON.stringify(event)}\n\n`;
      controller.enqueue(encoder.encode(data));
    }
    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
    controller.close();
  },
});
```

---

## Dashboard - SQL API Authentication

**File:** `app/api/dashboard/route.ts`  
**Endpoint:** `GET /api/dashboard`  
**Target:** Snowflake SQL API v2

### Authentication Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────────┐
│  Dashboard UI   │────▶│  /api/dashboard  │────▶│  Snowflake SQL API v2  │
│  (React)        │     │  (Next.js API)   │     │  /api/v2/statements    │
└─────────────────┘     └──────────────────┘     └────────────────────────┘
```

### Authentication Headers

The dashboard API supports both OAuth and JWT authentication:

```typescript
async function getAuthHeaders(): Promise<Record<string, string>> {
  const oauthToken = getOAuthToken();
  
  if (oauthToken) {
    // SPCS Environment - OAuth Token
    return {
      "Authorization": `Bearer ${oauthToken}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-Snowflake-Authorization-Token-Type": "OAUTH",
    };
  }
  
  // Local Development - JWT Key-Pair
  const jwtToken = generateJwtToken();
  return {
    "Authorization": `Bearer ${jwtToken}`,
    "X-Snowflake-Authorization-Token-Type": "KEYPAIR_JWT",
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
}
```

### SQL Execution

```typescript
async function executeQuery(sql: string): Promise<Record<string, unknown>[]> {
  const baseUrl = getAccountBaseUrl();
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${baseUrl}/api/v2/statements`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      statement: sql,
      timeout: 60,
      database: "CUSTOMER_DEMO",
      schema: "PUBLIC",
      warehouse: "COMPUTE_WH",
    }),
  });

  // Handle async query execution with polling
  const result = await response.json();
  
  if (result.statementStatusUrl) {
    // Long-running query - poll for results
    let pollCount = 0;
    while (pollCount < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const pollResponse = await fetch(
        `${baseUrl}${result.statementStatusUrl}`, 
        { headers }
      );
      const pollResult = await pollResponse.json();
      if (pollResult.statementHandle && pollResult.data) {
        return transformData(pollResult);
      }
      pollCount++;
    }
    throw new Error("Query timed out");
  }
  
  return transformData(result);
}
```

### Dashboard Queries

The dashboard executes multiple parallel queries to fetch all required data:

```typescript
const [
  ageGroupsResult,
  incomeResult,
  totalCustomersResult,
  productsResult,
  channelsResult,
  preferencesResult,
  financialResult,
  segmentValueResult,
  activityResult,
] = await Promise.all([
  executeQuery(`SELECT AGE_GROUP, COUNT(*) FROM CUSTOMER_DEMOGRAPHICS...`),
  executeQuery(`SELECT INCOME_BRACKET, COUNT(*) FROM CUSTOMER_DEMOGRAPHICS...`),
  // ... more queries
]);
```

---

## Customer Search Bar Authentication

**File:** `app/api/customers/search/route.ts`  
**Endpoint:** `GET /api/customers/search?q=<query>&limit=<n>`  
**Target:** Snowflake SQL API v2

### Authentication Flow

```
┌──────────────────┐     ┌──────────────────────┐     ┌────────────────────────┐
│  CustomerSearch  │────▶│  /api/customers/     │────▶│  Snowflake SQL API v2  │
│  Component       │     │  search              │     │  /api/v2/statements    │
└──────────────────┘     └──────────────────────┘     └────────────────────────┘
```

### Frontend Request

The search component makes debounced requests (300ms) to the search API:

```typescript
useEffect(() => {
  const searchCustomers = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/customers/search?q=${encodeURIComponent(query)}&limit=10`
      );
      if (response.ok) {
        const data = await response.json();
        setResults(data.customers);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const debounce = setTimeout(searchCustomers, 300);
  return () => clearTimeout(debounce);
}, [query]);
```

### Backend Authentication

Uses the same dual-auth pattern as the dashboard:

```typescript
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";
  const limit = parseInt(searchParams.get("limit") || "20");

  let sql: string;
  if (query) {
    const escapedQuery = query.replace(/'/g, "''");
    sql = `
      SELECT CUSTOMER_ID, ADDRESS, AGE, AGE_GROUP, GENDER, 
             INCOME_BRACKET, MARITAL_STATUS
      FROM CUSTOMER_DEMO.PUBLIC.CUSTOMER_DEMOGRAPHICS
      WHERE UPPER(CUSTOMER_ID) LIKE UPPER('%${escapedQuery}%')
         OR UPPER(ADDRESS) LIKE UPPER('%${escapedQuery}%')
      ORDER BY CUSTOMER_ID
      LIMIT ${limit}
    `;
  }

  const customers = await executeQuery(sql);
  return NextResponse.json({ customers });
}
```

---

## Authentication Flow Diagrams

### SPCS Deployment (OAuth)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SPCS Container Environment                        │
│  ┌──────────────┐                                                   │
│  │ /snowflake/  │                                                   │
│  │ session/     │──────┐                                            │
│  │ token        │      │                                            │
│  └──────────────┘      ▼                                            │
│                   ┌─────────────┐                                   │
│                   │ Next.js App │                                   │
│                   │  API Routes │                                   │
│                   └──────┬──────┘                                   │
│                          │                                          │
└──────────────────────────┼──────────────────────────────────────────┘
                           │ Authorization: Bearer <oauth_token>
                           │ X-Snowflake-Authorization-Token-Type: OAUTH
                           ▼
              ┌────────────────────────────┐
              │   Snowflake Account        │
              │   - SQL API v2             │
              │   - Cortex Agent API       │
              └────────────────────────────┘
```

### Local Development (JWT Key-Pair)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Local Development Environment                     │
│                                                                      │
│  ┌──────────────┐     ┌──────────────────────────────────────┐      │
│  │ ~/.snowflake │     │           Next.js App                │      │
│  │ /keys/       │────▶│  ┌─────────────────────────────────┐│      │
│  │ rsa_key.p8   │     │  │ JWT Token Generation            ││      │
│  └──────────────┘     │  │ - Load RSA private key          ││      │
│                       │  │ - Generate SHA256 fingerprint   ││      │
│                       │  │ - Create JWT with RS256         ││      │
│                       │  │ - Cache for 58 minutes          ││      │
│                       │  └─────────────────────────────────┘│      │
│                       └──────────────┬───────────────────────┘      │
│                                      │                              │
└──────────────────────────────────────┼──────────────────────────────┘
                                       │ Authorization: Bearer <jwt_token>
                                       │ X-Snowflake-Authorization-Token-Type: KEYPAIR_JWT
                                       ▼
                          ┌────────────────────────────┐
                          │   Snowflake Account        │
                          │   - SQL API v2             │
                          │   - Cortex Agent API       │
                          └────────────────────────────┘
```

---

## Security Considerations

### Token Caching

JWT tokens are cached to reduce cryptographic operations:

```typescript
let cachedJwtToken: string | null = null;
let tokenExpiry: number = 0;

// Token is valid for 1 hour, cached for 58 minutes
if (cachedJwtToken && Date.now() < tokenExpiry) {
  return cachedJwtToken;
}
```

### OAuth Token Refresh (SPCS)

In SPCS, the OAuth token at `/snowflake/session/token` is automatically refreshed by the container runtime. The `lib/snowflake.ts` SDK handles token changes:

```typescript
function isRetryableError(err: unknown): boolean {
  const error = err as { message?: string; code?: number };
  return !!(
    error.message?.includes("OAuth access token expired") ||
    error.message?.includes("terminated connection") ||
    error.code === 407002
  );
}

// Automatic retry on token expiration
export async function query<T>(sql: string, retries = 1): Promise<T[]> {
  try {
    const conn = await getConnection();
    // ... execute query
  } catch (err) {
    if (retries > 0 && isRetryableError(err)) {
      connection = null;  // Force reconnection
      return query(sql, retries - 1);
    }
    throw err;
  }
}
```

### SQL Injection Protection

User input is escaped before inclusion in SQL queries:

```typescript
const escapedQuery = query.replace(/'/g, "''");
sql = `...WHERE UPPER(CUSTOMER_ID) LIKE UPPER('%${escapedQuery}%')...`;
```

### Private Key Storage

- **SPCS**: No private key needed; OAuth token provided by runtime
- **Local**: Private key stored at `~/.snowflake/keys/rsa_key.p8` or custom path via `SNOWFLAKE_PRIVATE_KEY_PATH`

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SNOWFLAKE_USER` | Snowflake username | `admin` |
| `SNOWFLAKE_PRIVATE_KEY_PATH` | Path to RSA private key | `~/.snowflake/keys/rsa_key.p8` |
| `SNOWFLAKE_HOST` | Snowflake host (SPCS only) | - |
| `SNOWFLAKE_ACCOUNT` | Snowflake account identifier | `SFSEEUROPE-EU_DEMO86` |
| `SNOWFLAKE_WAREHOUSE` | Default warehouse | `COMPUTE_WH` |
| `SNOWFLAKE_DATABASE` | Default database | `CUSTOMER_DEMO` |
| `SNOWFLAKE_SCHEMA` | Default schema | `PUBLIC` |
| `CORTEX_AGENT_NAME` | Cortex Agent FQN | `CUSTOMER_DEMO.PUBLIC.CUSTOMER_360` |

---

## Summary

| Component | API Endpoint | Snowflake Target | Auth (SPCS) | Auth (Local) |
|-----------|--------------|------------------|-------------|--------------|
| Chat | `/api/agent` | Cortex Agent API | OAuth | JWT Key-Pair |
| Dashboard | `/api/dashboard` | SQL API v2 | OAuth | JWT Key-Pair |
| Customer Search | `/api/customers/search` | SQL API v2 | OAuth | JWT Key-Pair |

All components use the same dual-authentication strategy, automatically selecting the appropriate method based on the deployment environment.
