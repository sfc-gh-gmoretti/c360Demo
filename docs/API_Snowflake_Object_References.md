# API Snowflake Object References

This document lists all Snowflake objects referenced by each API endpoint in the Customer 360 application.

---

## Summary of Issues

| API | Database Referenced | Correct Database | Status |
|-----|---------------------|------------------|--------|
| `/api/agent` | `CUSTOMER_DEMO.PUBLIC` | `CUSTOMER_360_DEMO.PUBLIC` | **MISMATCH** |
| `/api/dashboard` | `CUSTOMER_360_DEMO.PUBLIC` | `CUSTOMER_360_DEMO.PUBLIC` | OK |
| `/api/customers/search` | `CUSTOMER_360_DEMO.PUBLIC` | `CUSTOMER_360_DEMO.PUBLIC` | OK |
| `/api/predict/cross-sell` | `CUSTOMER_DEMO.PUBLIC` | `CUSTOMER_360_DEMO.PUBLIC` | **MISMATCH** |

---

## 1. `/api/agent/route.ts`

**File:** `app/api/agent/route.ts`

### Cortex Agent Reference
| Object Type | Referenced Name | Line |
|-------------|-----------------|------|
| Cortex Agent | `CUSTOMER_DEMO.PUBLIC.CUSTOMER_360` | Line 4 |

**Code:**
```typescript
const AGENT_NAME = process.env.CORTEX_AGENT_NAME || "CUSTOMER_DEMO.PUBLIC.CUSTOMER_360";
```

### API Endpoint Called
```
POST https://{host}/api/v2/databases/CUSTOMER_DEMO/schemas/PUBLIC/agents/CUSTOMER_360:run
```

### Authentication
- Uses JWT with private key from `/app/.snowflake/keys/rsa_key.p8` (SPCS) or `~/.snowflake/keys/rsa_key.p8` (local)
- **Does NOT use OAuth token** - always uses JWT

---

## 2. `/api/dashboard/route.ts`

**File:** `app/api/dashboard/route.ts`

### Database/Schema Context
| Setting | Value | Line |
|---------|-------|------|
| Database | `CUSTOMER_360_DEMO` | Line 65 |
| Schema | `PUBLIC` | Line 66 |
| Warehouse | `C360_WH` | Line 67 |

### Tables Queried
| Table | Purpose | Lines |
|-------|---------|-------|
| `CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_DEMOGRAPHICS` | Age groups, income brackets, total customers, financial data | 125, 137, 142, 166, 167, 173 |
| `CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_PENSION_DETAILS` | Pension type distribution, fund values | 145, 167 |
| `CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_INTERACTION_AND_LEADS` | Marketing channels, activity | 151, 181 |
| `CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_COMMUNICATION` | Communication preferences | 157 |

### SQL Queries
1. **Age Groups:** `SELECT AGE_GROUP, COUNT(*) FROM CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_DEMOGRAPHICS GROUP BY AGE_GROUP`
2. **Income Distribution:** `SELECT INCOME_BRACKET, COUNT(*) FROM CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_DEMOGRAPHICS GROUP BY INCOME_BRACKET`
3. **Total Customers:** `SELECT COUNT(*) FROM CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_DEMOGRAPHICS`
4. **Product Distribution:** `SELECT PENSION_TYPE, COUNT(*) FROM CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_PENSION_DETAILS GROUP BY PENSION_TYPE`
5. **Marketing Channels:** `SELECT MARKETING_CHANNEL, COUNT(*) FROM CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_INTERACTION_AND_LEADS GROUP BY MARKETING_CHANNEL`
6. **Communication Preferences:** `SELECT PREFERRED_CHANNEL, COUNT(*) FROM CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_COMMUNICATION GROUP BY PREFERRED_CHANNEL`
7. **Financial Summary:** Join between `CUSTOMER_DEMOGRAPHICS` and `CUSTOMER_PENSION_DETAILS`
8. **Segment Value:** `SELECT INCOME_BRACKET, SUM(TOTAL_PENSION_VALUE) FROM CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_DEMOGRAPHICS GROUP BY INCOME_BRACKET`

### Authentication
- Uses OAuth token from `/snowflake/session/token` (SPCS)
- Falls back to PAT from `SNOWFLAKE_PAT` env var
- **Does NOT support JWT**

---

## 3. `/api/customers/search/route.ts`

**File:** `app/api/customers/search/route.ts`

### Database/Schema Context
| Setting | Value | Line |
|---------|-------|------|
| Database | `CUSTOMER_360_DEMO` | Line 99 |
| Schema | `PUBLIC` | Line 100 |
| Warehouse | `C360_WH` | Line 101 |

### Tables Queried
| Table | Purpose | Lines |
|-------|---------|-------|
| `CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_DEMOGRAPHICS` | Customer search | 155, 164 |

### SQL Queries
```sql
SELECT CUSTOMER_ID, REGION, AGE, AGE_GROUP, GENDER, INCOME_BRACKET, HOMEOWNER_STATUS
FROM CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_DEMOGRAPHICS
WHERE CAST(CUSTOMER_ID AS VARCHAR) LIKE '%{query}%'
   OR UPPER(REGION) LIKE UPPER('%{query}%')
ORDER BY CUSTOMER_ID
LIMIT {limit}
```

### Authentication
- Uses OAuth token from `/snowflake/session/token` (SPCS)
- Falls back to JWT with private key

---

## 4. `/api/predict/cross-sell/route.ts`

**File:** `app/api/predict/cross-sell/route.ts`

### Database/Schema Context (SQL Fallback)
| Setting | Value | Line |
|---------|-------|------|
| Database | `CUSTOMER_DEMO` | Line 157 |
| Schema | `PUBLIC` | Line 158 |
| Warehouse | `COMPUTE_WH` | Line 159 |

### ML Model References
| Object Type | Referenced Name | Lines |
|-------------|-----------------|-------|
| ML Model (SQL) | `CUSTOMER_DEMO.PUBLIC.CROSS_SELL_PROPENSITY` | Line 292 |
| SPCS Service (Internal) | `http://cross-sell-inference-service.dpg7.svc.spcs.internal:5000/predict-proba` | Line 203 |
| SPCS Service (Public) | `https://avey5-sfseeurope-eu-demo86.snowflakecomputing.app/predict-proba` | Line 202 |

### SQL Query (Fallback)
```sql
SELECT TO_JSON(CUSTOMER_DEMO.PUBLIC.CROSS_SELL_PROPENSITY!PREDICT_PROBA(
  {age}::FLOAT,
  {incomeBracketEnc}::FLOAT,  
  {homeownerStatusNum}::FLOAT,
  {totalPensionValue}::FLOAT,
  {totalPensions}::FLOAT,
  {riskCategoryEnc}::FLOAT,
  {riskScore}::FLOAT,
  {investmentKnowledgeEnc}::FLOAT,
  {marketingEngagementEnc}::FLOAT,
  {hasPensionsNum}::FLOAT,
  {hasIsaNum}::FLOAT
)) AS prediction_json
```

### Authentication
- REST API: Uses JWT with `Snowflake Token="{jwt}"` header format
- SQL Fallback: Uses OAuth or JWT

---

## 5. `lib/cortex-agent.ts`

**File:** `lib/cortex-agent.ts`

### Agent API Call
The library constructs the agent URL by splitting the agent name:
```typescript
const [database, schema, name] = agentName.split(".");
const url = `${baseUrl}/api/v2/databases/${database}/schemas/${schema}/agents/${name}:run`;
```

### Authentication
- **Always uses JWT** - does NOT check for OAuth token
- Private key path: `SNOWFLAKE_PRIVATE_KEY_PATH` env var or `${HOME}/.snowflake/keys/rsa_key.p8`

---

## Environment Variables

| Variable | Used By | Default Value |
|----------|---------|---------------|
| `CORTEX_AGENT_NAME` | `/api/agent` | `CUSTOMER_DEMO.PUBLIC.CUSTOMER_360` |
| `SNOWFLAKE_ACCOUNT` | All APIs | (none) |
| `SNOWFLAKE_HOST` | All APIs | `{account}.snowflakecomputing.com` |
| `SNOWFLAKE_USER` | JWT auth | `admin` |
| `SNOWFLAKE_PRIVATE_KEY_PATH` | JWT auth | `~/.snowflake/keys/rsa_key.p8` |
| `SNOWFLAKE_PAT` | `/api/dashboard` | (none) |

---

## Actual Objects in Snowflake Account

Based on query results from the account:

### Database
- **Actual:** `CUSTOMER_360_DEMO`

### Tables in `CUSTOMER_360_DEMO.PUBLIC`
| Table Name | Row Count |
|------------|-----------|
| CUSTOMER_DEMOGRAPHICS | 1,500 |
| CUSTOMER_PENSION_DETAILS | 1,500 |
| CUSTOMER_COMMUNICATION | 1,500 |
| CUSTOMER_INTERACTION_AND_LEADS | 1,500 |
| CUSTOMER_PRODUCTS | 1,500 |
| CUSTOMER_MINDSET | 1,500 |
| CWE_DATA | 1,500 |

### Views in `CUSTOMER_360_DEMO.PUBLIC`
| View Name | Type |
|-----------|------|
| CUSTOMER_360_SEMANTIC_VIEW | Semantic View |

### SPCS Services
| Service Name | Status | Compute Pool |
|--------------|--------|--------------|
| CUSTOMER_360_APP | RUNNING | C360_WEBAPP_POOL |

---

## Required Fixes

### 1. Agent Name Mismatch
**Current:** `CUSTOMER_DEMO.PUBLIC.CUSTOMER_360`  
**Should be:** `CUSTOMER_360_DEMO.PUBLIC.CUSTOMER_360` (if agent exists) or update to use semantic view

### 2. Cross-Sell Model Database
**Current:** `CUSTOMER_DEMO.PUBLIC.CROSS_SELL_PROPENSITY`  
**Should be:** `CUSTOMER_360_DEMO.PUBLIC.CROSS_SELL_PROPENSITY` (if model exists)

### 3. Cross-Sell Warehouse
**Current:** `COMPUTE_WH`  
**Should be:** `C360_WH` (for consistency)

### 4. Cortex Agent Authentication in SPCS
**Issue:** `lib/cortex-agent.ts` always uses JWT, never OAuth  
**Fix:** Should check for OAuth token first like other APIs

---

## Service Logs Errors (from SPCS)

1. **Dashboard API:**
   ```
   Error: Query failed: 401 - { "code": "395092", "message": "Client is unauthorized to use Snowpark Container Services OAuth token." }
   ```

2. **Chat/Agent API:**
   ```
   Error: Private key not found at /app/.snowflake/keys/rsa_key.p8
   ```
