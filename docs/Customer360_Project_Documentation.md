# Aviva Customer 360 Intelligence - Complete Project Documentation

**Project:** AI-Powered Customer Insights Platform  
**Built On:** Snowflake + Cortex AI + SPCS  
**Last Updated:** March 7, 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Data Model](#3-data-model)
4. [Application Features](#4-application-features)
5. [Implementation Timeline](#5-implementation-timeline)
6. [Technical Details](#6-technical-details)
7. [Deployment Guide](#7-deployment-guide)
8. [Troubleshooting](#8-troubleshooting)
9. [Pending Enhancements](#9-pending-enhancements)

---

## 1. Project Overview

### Purpose
Build an AI-powered Customer 360 application for Aviva (UK insurance company) that enables financial advisers to:
- Query customer data using natural language via Cortex Agent
- View comprehensive customer profiles and analytics
- Run ML-powered cross-sell propensity predictions
- Analyze customer conversations via voice recording

### Key Technologies
| Component | Technology |
|-----------|------------|
| Frontend | Next.js 16 + React + shadcn/ui + Tailwind CSS |
| Backend | Next.js API Routes |
| AI Agent | Snowflake Cortex Agent |
| Analytics | Cortex Analyst + Semantic Views |
| ML Models | Snowflake ML Registry (XGBoost) |
| Deployment | Snowpark Container Services (SPCS) |
| Data | 7 customer data tables in Snowflake |

### Snowflake Account Details
- **Account:** SFSEEUROPE-EU_DEMO86
- **Connection:** Demo86
- **Database/Schema:** CUSTOMER_DEMO.PUBLIC
- **Warehouse:** COMPUTE_WH / DEMO_WH

---

## 2. Architecture

### System Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │    Chat     │ │  Dashboard  │ │ ML Simulator│ │    Voice    ││
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘│
└─────────┼───────────────┼───────────────┼───────────────┼───────┘
          │               │               │               │
          ▼               ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS APP (SPCS)                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │ /api/agent  │ │/api/dashboard│ │/api/predict │ │/api/analyze ││
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘│
└─────────┼───────────────┼───────────────┼───────────────┼───────┘
          │               │               │               │
          ▼               ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SNOWFLAKE                                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │Cortex Agent │ │ SQL Execute │ │ ML Registry │ │Cortex COMPLETE│
│  │CUSTOMER_360 │ │             │ │Cross-sell v1│ │ AI_TRANSCRIBE││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    DATA TABLES                               ││
│  │ CUSTOMER_DEMOGRAPHICS | CUSTOMER_PENSION_DETAILS            ││
│  │ CUSTOMER_COMMUNICATION | CUSTOMER_INTERACTION_AND_LEADS      ││
│  │ CUSTOMER_PRODUCTS | CUSTOMER_MINDSET | CWE_DATA              ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### SPCS Service Details
- **Service Name:** `CUSTOMER_DEMO.PUBLIC.AVIVA_CUSTOMER360_APP`
- **Compute Pool:** `TUTORIAL_COMPUTE_POOL`
- **Endpoint:** https://awey5-sfseeurope-eu-demo86.snowflakecomputing.app/
- **Image Registry:** `sfseeurope-eu-demo86.registry.snowflakecomputing.com/customer_demo/public/images/aviva-customer360`

---

## 3. Data Model

### Customer Data Tables (7 Tables)

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `CUSTOMER_DEMOGRAPHICS` | Core customer info | CUSTOMER_ID, AGE, AGE_GROUP, GENDER, INCOME_BRACKET, TOTAL_PENSION_VALUE |
| `CUSTOMER_PENSION_DETAILS` | Pension accounts | CUSTOMER_ID, PENSION_TYPE, FUND_VALUE, ANNUAL_CONTRIBUTION |
| `CUSTOMER_COMMUNICATION` | Contact preferences | CUSTOMER_ID, PREFERRED_CHANNEL, CONSENT_TO_EMAIL/PHONE/SMS |
| `CUSTOMER_INTERACTION_AND_LEADS` | Marketing history | CUSTOMER_ID, MARKETING_CHANNEL, CAMPAIGN_RESPONSE, LEAD_CONVERTED |
| `CUSTOMER_PRODUCTS` | Product holdings | CUSTOMER_ID, HAS_ISA, HAS_PENSION, HAS_PROTECTION_POLICY, IS_MULTI_PRODUCT |
| `CUSTOMER_MINDSET` | Risk profile | CUSTOMER_ID, RISK_CATEGORY, RISK_SCORE, ESG_PREFERENCE |
| `CWE_DATA` | Service history | CUSTOMER_ID, TOTAL_TOUCHPOINTS, TOTAL_CALLS, SERVICE_QUALITY_INDICATOR |

### Semantic View
- **Name:** `CUSTOMER_DEMO.PUBLIC.CUSTOMER_360`
- **Purpose:** Natural language SQL generation via Cortex Analyst
- **Definition:** YAML file with table relationships, metrics, and dimensions

### Cortex Agent
- **Name:** `CUSTOMER_DEMO.PUBLIC.CUSTOMER_360`
- **Tools:** Cortex Analyst (SQL generation), Cortex Search
- **Model:** Claude with streaming + thinking enabled

---

## 4. Application Features

### 4.1 Chat Interface (Cortex Agent)
- **Natural Language Queries:** Ask questions about customers in plain English
- **Real-Time Streaming:** Shows agent reasoning as it processes
- **Tool Use Display:** Shows Cortex Analyst (SQL) and Search tool calls
- **Data Visualization:** Auto-generates charts (bar, pie, line) from results
- **SQL Preview:** View generated SQL queries
- **Dark/Light Mode:** Theme toggle

**Implementation Files:**
- `components/chat-interface.tsx` - Main chat UI
- `lib/cortex-agent.ts` - Cortex Agent API client
- `app/api/agent/route.ts` - Agent API endpoint

### 4.2 Dashboard
- **Customer Metrics:** Total customers, age distribution, product distribution
- **Interactive Charts:** Recharts-based visualizations
- **Filters:** Age group, income bracket, product type

**Implementation Files:**
- `components/dashboard.tsx` - Dashboard UI
- `app/api/dashboard/route.ts` - Dashboard data API

### 4.3 Customer 360 View
- **Customer Search:** Search by ID, name, or attributes
- **Profile View:** Complete customer profile across all 7 tables
- **AI Analysis:** Cortex Complete generates financial adviser recommendations
- **Product Recommendations:** Based on customer profile and risk tolerance

**Implementation Files:**
- `components/customer-360-view.tsx` - Customer profile UI
- `app/api/customers/search/route.ts` - Customer search API
- `app/api/customers/[customerId]/route.ts` - Customer details API
- `app/api/customers/[customerId]/analyze/route.ts` - AI analysis API

### 4.4 ML Simulator (Cross-Sell Propensity)
- **Feature Sliders:** Adjust customer attributes (age, income, pension value, etc.)
- **Real-Time Predictions:** XGBoost model predicts cross-sell probability
- **Score Display:** Percentage probability with recommendation badge

**Implementation Files:**
- `components/scenario-simulator.tsx` - Simulator UI
- `app/api/predict/cross-sell/route.ts` - ML prediction API

**ML Model:**
- **Name:** `CUSTOMER_DEMO.PUBLIC.CROSS_SELL_PROPENSITY v1`
- **Algorithm:** XGBoost Classifier
- **Target:** IS_MULTI_PRODUCT (probability of multi-product customer)
- **Inference Service:** `cross-sell-inference-service` in SPCS

### 4.5 Voice Recorder (Planned)
- **Audio Recording:** MediaRecorder API for browser audio capture
- **Transcription:** Snowflake AI_TRANSCRIBE function
- **Analysis:** Cortex Complete summarizes conversation and extracts questions
- **Agent Routing:** Questions sent to Customer 360 agent

**Status:** Planned (see Section 9)

### 4.6 Build Guide
- **Documentation:** `/guide` page with setup instructions
- **Architecture Diagram:** Visual system overview
- **Code Examples:** Integration patterns and API usage

---

## 5. Implementation Timeline

### Phase 1: Foundation (February 2026)
- [x] Create 7 customer data tables with sample data
- [x] Build semantic view YAML definition
- [x] Create Cortex Agent (CUSTOMER_360)
- [x] Build Next.js application scaffold
- [x] Implement basic chat interface
- [x] Add Aviva branding (yellow #FDD900, navy #002F5F)

### Phase 2: SPCS Deployment (February 2026)
- [x] Create Dockerfile for containerization
- [x] Set up SPCS compute pool and service
- [x] Implement dual auth (OAuth for SPCS, JWT for local dev)
- [x] Fix customer search/details APIs for SPCS
- [x] Configure network policy for SPCS egress IPs
- [x] Deploy v1-v11 iterations

### Phase 3: Enhanced Features (February-March 2026)
- [x] **Real-Time Agent Streaming:** Enable thinking display with live reasoning
- [x] **Dark/Light Mode:** Theme toggle with next-themes
- [x] **Auto-Charts:** Smart chart detection from query results
- [x] **Guide Page Enhancements:** Animated hero, architecture diagram
- [x] **Analyse Button Fix:** White text on dark background, shimmer effect

### Phase 4: ML Integration (March 2026)
- [x] Train XGBoost cross-sell propensity model
- [x] Register model in Snowflake ML Registry
- [x] Build ML Simulator UI with feature sliders
- [x] Create prediction API endpoint
- [x] Deploy ML inference service to SPCS

### Phase 5: Voice Features (Planned)
- [ ] Replace Web Speech API with MediaRecorder
- [ ] Create audio upload API endpoint
- [ ] Implement AI_TRANSCRIBE integration
- [ ] Add transcript analysis with Cortex Complete
- [ ] Build real-time agent response streaming UI

---

## 6. Technical Details

### 6.1 Authentication Pattern

The application uses dual authentication:

**SPCS Environment (Production):**
```typescript
function getOAuthToken(): string | null {
  const tokenPath = "/snowflake/session/token";
  try {
    if (fs.existsSync(tokenPath)) {
      return fs.readFileSync(tokenPath, "utf8");
    }
  } catch {}
  return null;
}
```

**Local Development (JWT Key-Pair):**
```typescript
function generateJwtToken(): string {
  const privateKey = getPrivateKey();
  const qualifiedAccountName = "SFSEEUROPE-EU_DEMO86";
  // ... JWT generation with RSA256
  return jwt.sign(payload, privateKey, { algorithm: "RS256" });
}
```

### 6.2 Cortex Agent Streaming

Real-time streaming with thinking enabled:

```typescript
body: JSON.stringify({
  messages,
  stream: true,
  experimental: {
    enable_thinking: true,
  },
}),
```

**Event Types:**
- `status`: Agent status (planning, executing_tools, etc.)
- `content_index` + `text`: Thinking text chunks
- `tool_use`: Tool invocation (Cortex Analyst, Search)
- `tool_result`: Tool execution results
- Final content: Response text

### 6.3 ML Model Integration

**Internal DNS for SPCS Service-to-Service:**
```typescript
const isSpcs = fs.existsSync('/snowflake/session/token');
const modelUrl = isSpcs 
  ? 'http://cross-sell-inference-service.dpg7.svc.spcs.internal:5000/predict-proba'
  : 'https://external-url/predict-proba';
```

### 6.4 Key API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/agent` | POST | Cortex Agent chat |
| `/api/dashboard` | GET | Dashboard metrics |
| `/api/customers/search` | GET | Customer search |
| `/api/customers/[id]` | GET | Customer details |
| `/api/customers/[id]/analyze` | POST | AI customer analysis |
| `/api/predict/cross-sell` | POST | ML prediction |

---

## 7. Deployment Guide

### Build and Deploy Process

```bash
# 1. Build Next.js application
cd /Users/gmoretti/Documents/SnowflakeCOCO/Customer360/aviva-customer360
npm run build

# 2. Build Docker image (linux/amd64 for SPCS)
docker build --platform linux/amd64 \
  -t sfseeurope-eu-demo86.registry.snowflakecomputing.com/customer_demo/public/images/aviva-customer360:vXX .

# 3. Login to Snowflake image registry
snow spcs image-registry login --connection Demo86

# 4. Push image to registry
docker push sfseeurope-eu-demo86.registry.snowflakecomputing.com/customer_demo/public/images/aviva-customer360:vXX

# 5. Update SPCS service
-- Run in Snowflake:
ALTER SERVICE CUSTOMER_DEMO.PUBLIC.AVIVA_CUSTOMER360_APP
  FROM SPECIFICATION $$
  spec:
    containers:
      - name: app
        image: /customer_demo/public/images/aviva-customer360:vXX
        ...
  $$;
```

### Version History

| Version | Date | Changes |
|---------|------|---------|
| v1-v7 | Feb 2026 | Initial development, chat interface |
| v8 | Feb 2026 | Fixed guide page (7 tables) |
| v9 | Feb 2026 | Aviva favicon branding |
| v10 | Feb 2026 | Fixed customer search API auth |
| v11 | Feb 2026 | Fixed customer details API auth |
| v12+ | Feb-Mar 2026 | UI enhancements, ML integration |

---

## 8. Troubleshooting

### 8.1 SPCS IP Whitelist Issue (RECURRING)

**Symptom:** Chat fails silently, logs show:
```
Incoming request with IP/Token 153.45.52.XXX is not allowed to access Snowflake
```

**Diagnosis:**
```sql
SHOW NETWORK POLICIES
-- Check if entries_in_allowed_network_rules = 0 for ACCOUNT_VPN_POLICY_SE
```

**Fix:**
```sql
ALTER NETWORK POLICY ACCOUNT_VPN_POLICY_SE SET 
  ALLOWED_NETWORK_RULE_LIST = ('CUSTOMER_DEMO.PUBLIC.SPCS_EGRESS_IPS');
```

**Network Rule Details:**
- **Rule Name:** `CUSTOMER_DEMO.PUBLIC.SPCS_EGRESS_IPS`
- **IP Range:** 153.45.52.128 - 153.45.52.160 (33 IPs)
- **Type:** IPV4 INGRESS

### 8.2 Service Auto-Suspend Latency

**Symptom:** First request fast, subsequent requests after idle are slow (~12s)

**Fix:**
```sql
-- Disable auto-suspend (always running)
ALTER SERVICE CUSTOMER_DEMO.PUBLIC.CROSS_SELL_INFERENCE_SERVICE 
  SET AUTO_SUSPEND_SECS = 0

-- Or increase timeout (e.g., 2 hours)
ALTER SERVICE ... SET AUTO_SUSPEND_SECS = 7200
```

### 8.3 Checking Service Status

```sql
-- Check service status
SELECT SYSTEM$GET_SERVICE_STATUS('CUSTOMER_DEMO.PUBLIC.AVIVA_CUSTOMER360_APP')

-- Get service logs
SELECT SYSTEM$GET_SERVICE_LOGS('CUSTOMER_DEMO.PUBLIC.AVIVA_CUSTOMER360_APP', 0, 'app', 200)

-- Show all services
SHOW SERVICES IN SCHEMA CUSTOMER_DEMO.PUBLIC
```

---

## 9. Pending Enhancements

### 9.1 Voice Recorder with AI_TRANSCRIBE

**Plan:** Replace Web Speech API (browser-only) with Snowflake-native solution

**Architecture:**
1. Record audio using MediaRecorder API (browser)
2. Upload audio blob to Snowflake stage
3. Transcribe using AI_TRANSCRIBE function
4. Analyze with Cortex Complete (summary + question extraction)
5. Route questions to Customer 360 agent with streaming

**Files to Create:**
- `app/api/upload-audio/route.ts` - Audio upload to stage
- `app/api/transcribe-audio/route.ts` - AI_TRANSCRIBE integration
- Updated `components/voice-recorder.tsx` - MediaRecorder implementation

**SQL Setup Required:**
```sql
CREATE OR REPLACE STAGE CUSTOMER_DEMO.PUBLIC.VOICE_RECORDINGS
  DIRECTORY = (ENABLE = TRUE);
```

### 9.2 Network Policy Monitoring

**Issue:** SPCS egress rule periodically detaches from network policy

**Recommended:** Set up monitoring/alerting for network policy configuration changes

### 9.3 Additional ML Models

- Customer churn prediction
- Lifetime value estimation
- Next-best-action recommendation

---

## 10. Project Files Reference

### Application Directory
```
/Users/gmoretti/Documents/SnowflakeCOCO/Customer360/aviva-customer360/
├── app/
│   ├── api/
│   │   ├── agent/route.ts           # Cortex Agent API
│   │   ├── dashboard/route.ts       # Dashboard data API
│   │   ├── customers/
│   │   │   ├── search/route.ts      # Customer search
│   │   │   └── [customerId]/
│   │   │       ├── route.ts         # Customer details
│   │   │       └── analyze/route.ts # AI analysis
│   │   └── predict/
│   │       └── cross-sell/route.ts  # ML prediction
│   ├── guide/page.tsx               # Build guide page
│   └── layout.tsx                   # App layout
├── components/
│   ├── chat-interface.tsx           # Main chat UI
│   ├── customer-360-view.tsx        # Customer profile
│   ├── dashboard.tsx                # Dashboard
│   ├── scenario-simulator.tsx       # ML simulator
│   ├── voice-recorder.tsx           # Voice recording
│   ├── theme-provider.tsx           # Dark/light mode
│   └── ui/                          # shadcn components
├── lib/
│   └── cortex-agent.ts              # Cortex Agent client
├── Dockerfile                       # Container definition
└── spcs-spec.yaml                   # SPCS specification
```

### Snowflake Objects
```sql
-- Database and Schema
CUSTOMER_DEMO.PUBLIC

-- Tables (7)
CUSTOMER_DEMOGRAPHICS
CUSTOMER_PENSION_DETAILS
CUSTOMER_COMMUNICATION
CUSTOMER_INTERACTION_AND_LEADS
CUSTOMER_PRODUCTS
CUSTOMER_MINDSET
CWE_DATA

-- Semantic View
CUSTOMER_360

-- Cortex Agent
CUSTOMER_360

-- ML Model
CROSS_SELL_PROPENSITY v1

-- Network Rule
SPCS_EGRESS_IPS

-- SPCS Service
AVIVA_CUSTOMER360_APP

-- Compute Pool
TUTORIAL_COMPUTE_POOL
```

---

## 11. Contact & Support

**Project Directory:** `/Users/gmoretti/Documents/SnowflakeCOCO/Customer360`  
**SPCS App URL:** https://awey5-sfseeurope-eu-demo86.snowflakecomputing.app/  
**Snowflake Account:** SFSEEUROPE-EU_DEMO86

---

*Document generated: March 7, 2026*
